const { createClient } = require('@supabase/supabase-js');

const BOOK_COLUMNS =
  'id,title,author,category,cabinet,rack,row,quantity,available_quantity,created_at,updated_at';

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

const supabase = createSupabaseClient();

function isSupabaseEnabled() {
  return Boolean(supabase);
}

function normalizeBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    cabinet: row.cabinet ?? '',
    rack: row.rack ?? '',
    row: row.row ?? '',
    quantity: row.quantity,
    availableQuantity: row.available_quantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getBookGroupKey(book) {
  return [book.title, book.author]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .join('|');
}

function combineBookGroup(books) {
  const [firstBook] = books;

  return {
    ...firstBook,
    quantity: books.reduce((sum, book) => sum + book.quantity, 0),
    availableQuantity: books.reduce((sum, book) => sum + book.availableQuantity, 0),
    copyIds: books.map((book) => book.id),
    createdAt: books
      .map((book) => book.createdAt)
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0],
    updatedAt: books
      .map((book) => book.updatedAt)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0],
  };
}

function groupBooks(books) {
  const groups = new Map();

  for (const book of books) {
    const groupKey = getBookGroupKey(book);
    const group = groups.get(groupKey) ?? [];
    group.push(book);
    groups.set(groupKey, group);
  }

  return Array.from(groups.values())
    .map((group) => combineBookGroup(group))
    .sort((left, right) => left.title.localeCompare(right.title));
}

function toBookRow(payload, availableQuantity = payload.quantity) {
  return {
    title: payload.title,
    author: payload.author,
    category: payload.category,
    cabinet: payload.cabinet,
    rack: payload.rack,
    row: payload.row,
    quantity: payload.quantity,
    available_quantity: availableQuantity,
    updated_at: new Date().toISOString(),
  };
}

function handleSupabaseError(error) {
  if (error) {
    throw error;
  }
}

async function listBookRows() {
  const { data, error } = await supabase
    .from('books')
    .select(BOOK_COLUMNS)
    .order('title', { ascending: true });

  handleSupabaseError(error);
  return data.map(normalizeBook);
}

async function findBookGroup(bookId) {
  const rows = await listBookRows();
  const groupedBooks = groupBooks(rows);
  const group = groupedBooks.find((book) => book.id === bookId || book.copyIds.includes(bookId));

  if (!group) {
    return null;
  }

  return {
    groupedBook: group,
    rows: rows.filter((book) => group.copyIds.includes(book.id)),
  };
}

async function listBooks() {
  return groupBooks(await listBookRows());
}

async function createBook(payload) {
  const { data, error } = await supabase
    .from('books')
    .insert(toBookRow(payload))
    .select(BOOK_COLUMNS)
    .single();

  handleSupabaseError(error);
  return normalizeBook(data);
}

async function updateBook(bookId, payload, activeLoans) {
  const availableQuantity = payload.quantity - activeLoans;
  const group = await findBookGroup(bookId);
  const targetId = group?.groupedBook.id ?? bookId;
  const { data, error } = await supabase
    .from('books')
    .update(toBookRow(payload, availableQuantity))
    .eq('id', targetId)
    .select(BOOK_COLUMNS)
    .single();

  handleSupabaseError(error);

  if (group) {
    const duplicateIds = group.groupedBook.copyIds.filter((id) => id !== targetId);

    if (duplicateIds.length > 0) {
      const { error: deleteError } = await supabase.from('books').delete().in('id', duplicateIds);
      handleSupabaseError(deleteError);
    }
  }

  return normalizeBook(data);
}

async function updateBookAvailability(bookId, direction) {
  const group = await findBookGroup(bookId);

  if (!group) {
    return null;
  }

  const targetBook =
    direction === 'borrow'
      ? group.rows.find((book) => book.availableQuantity > 0)
      : group.rows.find((book) => book.availableQuantity < book.quantity) ?? group.rows[0];

  const nextAvailableQuantity =
    direction === 'borrow'
      ? targetBook.availableQuantity - 1
      : Math.min(targetBook.quantity, targetBook.availableQuantity + 1);

  const { data, error } = await supabase
    .from('books')
    .update({
      available_quantity: nextAvailableQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetBook.id)
    .select(BOOK_COLUMNS)
    .single();

  handleSupabaseError(error);

  const updatedRows = group.rows.map((book) =>
    book.id === data.id ? normalizeBook(data) : book
  );
  return combineBookGroup(updatedRows);
}

async function deleteBook(bookId) {
  const group = await findBookGroup(bookId);
  const idsToDelete = group ? group.groupedBook.copyIds : [bookId];
  const { error } = await supabase.from('books').delete().in('id', idsToDelete);
  handleSupabaseError(error);
}

module.exports = {
  createBook,
  deleteBook,
  isSupabaseEnabled,
  listBooks,
  updateBook,
  updateBookAvailability,
};

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

async function listBooks() {
  const { data, error } = await supabase
    .from('books')
    .select(BOOK_COLUMNS)
    .order('title', { ascending: true });

  handleSupabaseError(error);
  return data.map(normalizeBook);
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
  const { data, error } = await supabase
    .from('books')
    .update(toBookRow(payload, availableQuantity))
    .eq('id', bookId)
    .select(BOOK_COLUMNS)
    .single();

  handleSupabaseError(error);
  return normalizeBook(data);
}

async function updateBookAvailability(bookId, availableQuantity) {
  const { data, error } = await supabase
    .from('books')
    .update({
      available_quantity: availableQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookId)
    .select(BOOK_COLUMNS)
    .single();

  handleSupabaseError(error);
  return normalizeBook(data);
}

async function deleteBook(bookId) {
  const { error } = await supabase.from('books').delete().eq('id', bookId);
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

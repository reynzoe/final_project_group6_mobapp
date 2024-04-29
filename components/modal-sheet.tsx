import { PropsWithChildren, ReactNode, useMemo } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppPalette, radii, spacing, typography } from '@/constants/library-theme';
import { useTheme } from '@/contexts/theme-context';

type ModalSheetProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: ReactNode;
}>;

function makeStyles(palette: AppPalette) {
  return StyleSheet.create({
    sheet: { backgroundColor: palette.surface, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, maxHeight: '88%', borderWidth: 1, borderColor: palette.border },
    header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: palette.border, flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
    title: { color: palette.text, fontFamily: typography.heading, fontSize: 24 },
    subtitle: { color: palette.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 20 },
    close: { color: palette.primary, fontFamily: typography.body, fontSize: 14, fontWeight: '700' },
  });
}

export function ModalSheet({ visible, title, subtitle, onClose, footer, children }: ModalSheetProps) {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={staticStyles.backdrop}>
        <Pressable style={staticStyles.dismissLayer} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={staticStyles.keyboardAvoiding}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={staticStyles.headerCopy}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <Pressable onPress={onClose}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={staticStyles.content}>{children}</ScrollView>
            {footer ? <View style={staticStyles.footer}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const staticStyles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(14,22,28,0.55)' },
  dismissLayer: { flex: 1 },
  keyboardAvoiding: { width: '100%' },
  headerCopy: { flex: 1, gap: spacing.xs },
  content: { padding: spacing.lg, gap: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.sm },
});

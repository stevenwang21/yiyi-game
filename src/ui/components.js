import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, SHADOW, SHADOW_BTN } from './theme';

export function Button({
  title, sub, icon, onPress, onLongPress, onPressIn, onPressOut, delayLongPress,
  kind = 'primary', disabled, style, textStyle, small, align,
}) {
  const k = styles[kind] || styles.primary;
  const light = kind === 'ghost' || kind === 'soft';
  const textColor = kind === 'ghost' ? C.ink : kind === 'soft' ? C.primaryInk : '#fff';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={disabled ? undefined : onPressIn}
      onPressOut={onPressOut}
      delayLongPress={delayLongPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        k,
        !light && !disabled && SHADOW_BTN,
        disabled && styles.disabled,
        pressed && !disabled && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        align === 'left' && { alignItems: 'flex-start' },
        style,
      ]}
    >
      <Text style={[styles.btnText, small && styles.btnTextSmall, { color: textColor }, textStyle]}>
        {icon ? `${icon}  ` : ''}{title}
      </Text>
      {sub ? (
        <Text style={[styles.btnSub, { color: light ? C.muted : 'rgba(255,255,255,0.9)' }]}>{sub}</Text>
      ) : null}
    </Pressable>
  );
}

// 底部那一排：圖示在上、字在下
export function IconButton({ icon, label, onPress, alert, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.iconBtn, alert && styles.iconBtnAlert, pressed && { opacity: 0.7 }, style]}
    >
      <Text style={styles.iconBtnIcon}>{icon}</Text>
      <Text style={[styles.iconBtnLabel, alert && { color: C.red }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style, flat }) {
  return <View style={[styles.card, !flat && SHADOW, style]}>{children}</View>;
}

export function Bar({ value, max = 100, color, height = 8, track }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View style={[styles.barBg, { height, borderRadius: height, backgroundColor: track || C.page }]}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

// 副標的色塊：加的綠、扣的紅、花錢的金、純說明灰
const TONE_COLOR = { up: C.green, down: C.red, cost: C.goldInk, flat: C.muted };

export function Chip({ label, sub, subParts, urgent, icon, on, disabled, onPress, style, plain }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.chip, on && styles.chipOn, urgent && !on && styles.chipUrgent, disabled && styles.disabled,
        pressed && !disabled && { opacity: 0.8 }, style,
      ]}
    >
      {on && !plain ? <View style={styles.check}><Text style={styles.checkText}>✓</Text></View> : null}
      {urgent && !on ? <View style={styles.urgentDot} /> : null}
      <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
        {icon ? `${icon} ` : ''}{label}
      </Text>
      {subParts ? (
        <View style={[styles.subBox, plain && { minHeight: 0 }]}>
          {subParts.map((line, i) => (
            <Text key={i} style={styles.chipSub} numberOfLines={1}>
              {line.map((c, j) => (
                <Text key={j} style={{ color: TONE_COLOR[c.tone] || C.muted }}>{j ? '  ' : ''}{c.t}</Text>
              ))}
            </Text>
          ))}
        </View>
      ) : sub ? (
        <View style={[styles.subBox, plain && { minHeight: 0 }]}>
          <Text style={[styles.chipSub, on && { color: C.primaryInk }]} numberOfLines={2}>{sub}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Tag({ text, color = C.primaryInk, bg = C.primarySoft, style }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }, style]}>
      <Text style={[styles.tagText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  primary: { backgroundColor: C.primary },
  gold: { backgroundColor: C.gold },
  green: { backgroundColor: C.green },
  red: { backgroundColor: C.red },
  dark: { backgroundColor: '#0b1030' },
  soft: { backgroundColor: C.primarySoft },
  ghost: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardLine },
  disabled: { opacity: 0.4 },
  btnText: { fontSize: 16.5, fontWeight: '700', letterSpacing: 0 },
  btnTextSmall: { fontSize: 13.5 },
  btnSub: { fontSize: 12, marginTop: 3, fontWeight: '500' },

  iconBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6,
    borderRadius: 12, backgroundColor: 'transparent',
  },
  iconBtnAlert: { backgroundColor: C.redSoft },
  iconBtnIcon: { fontSize: 21, lineHeight: 25 },
  iconBtnLabel: { fontSize: 10.5, fontWeight: '500', color: C.muted, marginTop: 1 },

  card: { backgroundColor: C.card, borderRadius: 18, padding: 14, marginTop: 12, borderWidth: 1, borderColor: C.cardLine },
  barBg: { overflow: 'hidden' },

  chip: {
    flexBasis: '31%', flexGrow: 1, borderWidth: 1, borderColor: C.cardLine, backgroundColor: C.page,
    borderRadius: 14, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center',
  },
  chipOn: { borderColor: '#9d8cff', backgroundColor: C.primarySoft },
  chipText: { fontSize: 14, color: C.ink, fontWeight: '500' },
  chipTextOn: { fontWeight: '700', color: C.primaryInk },
  chipSub: { fontSize: 10.5, lineHeight: 13.5, textAlign: 'center', color: C.muted },
  subBox: { minHeight: 27, marginTop: 2, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  chipUrgent: { borderColor: C.gold },
  urgentDot: { position: 'absolute', top: -4, right: -3, width: 9, height: 9, borderRadius: 5, backgroundColor: C.gold },
  check: {
    position: 'absolute', top: -7, right: -5, width: 20, height: 20, borderRadius: 10,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 12, fontWeight: '900', lineHeight: 14 },

  tag: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 11.5, fontWeight: '600' },
});

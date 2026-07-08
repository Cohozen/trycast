/* @ds-bundle: {"format":4,"namespace":"TryCastDesignSystem_a0f4ea","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"SegmentedControl","sourcePath":"components/core/SegmentedControl.jsx"},{"name":"Skeleton","sourcePath":"components/core/Skeleton.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Header","sourcePath":"components/navigation/Header.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"},{"name":"CompetitionBadge","sourcePath":"components/rugby/CompetitionBadge.jsx"},{"name":"MatchCard","sourcePath":"components/rugby/MatchCard.jsx"},{"name":"RankingRow","sourcePath":"components/rugby/RankingRow.jsx"},{"name":"BonusToggle","sourcePath":"components/rugby/ScorePrediction.jsx"},{"name":"ScorePrediction","sourcePath":"components/rugby/ScorePrediction.jsx"},{"name":"ScoreStepper","sourcePath":"components/rugby/ScoreStepper.jsx"},{"name":"FLAGS","sourcePath":"components/rugby/TeamFlag.jsx"},{"name":"TeamFlag","sourcePath":"components/rugby/TeamFlag.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"5acfce476f7e","components/core/Badge.jsx":"fe9a7e9e00c1","components/core/Button.jsx":"3e294986d815","components/core/Chip.jsx":"8fdd67d9db42","components/core/IconButton.jsx":"f09fc2936a80","components/core/Input.jsx":"a9db68d9c3b3","components/core/SegmentedControl.jsx":"b75fe4d3a08d","components/core/Skeleton.jsx":"f7c1ba87c5d7","components/feedback/EmptyState.jsx":"93a674e76cf6","components/feedback/Toast.jsx":"abb28720abf3","components/navigation/Header.jsx":"b2d8cf0fb524","components/navigation/TabBar.jsx":"6772839c5867","components/rugby/CompetitionBadge.jsx":"a6f387c48a36","components/rugby/MatchCard.jsx":"6d98f9e117eb","components/rugby/RankingRow.jsx":"967a31baad77","components/rugby/ScorePrediction.jsx":"1652f66abeed","components/rugby/ScoreStepper.jsx":"e49c329a2bb1","components/rugby/TeamFlag.jsx":"68c2fafdf4a3","uploads/trycast-colors.ts":"4c9d112f06fe"},"inlinedExternals":[],"unexposedExports":[{"name":"palette","sourcePath":"uploads/trycast-colors.ts"},{"name":"theme","sourcePath":"uploads/trycast-colors.ts"}]} */

(() => {

const __ds_ns = (window.TryCastDesignSystem_a0f4ea = window.TryCastDesignSystem_a0f4ea || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Avatar — user identity. Falls back to initials on brand green.
 * size: sm | md | lg. Optional grenat ring for "you".
 */
function Avatar({
  name = '',
  src = null,
  size = 'md',
  ring = false,
  style,
  ...rest
}) {
  const dims = {
    sm: 32,
    md: 40,
    lg: 56
  }[size] || 40;
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: dims,
      height: dims,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--brand)',
      color: 'var(--on-brand)',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-bold)',
      fontSize: dims * 0.38,
      overflow: 'hidden',
      flexShrink: 0,
      boxShadow: ring ? '0 0 0 2px var(--bg), 0 0 0 4px var(--accent)' : 'none',
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials || '?');
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — small status/count label.
 * tone: neutral | brand | accent | live | success | warning | info
 * variant: solid | soft | outline
 */
function Badge({
  children,
  tone = 'neutral',
  variant = 'soft',
  dot = false,
  style,
  ...rest
}) {
  const map = {
    neutral: '--text-muted',
    brand: '--brand',
    accent: '--accent',
    live: '--status-live',
    success: '--success-500',
    warning: '--warning-500',
    info: '--info-500'
  };
  const c = `var(${map[tone] || map.neutral})`;
  const styles = {
    solid: {
      background: c,
      color: tone === 'neutral' ? 'var(--surface)' : 'var(--on-accent)',
      border: '1px solid transparent'
    },
    soft: {
      background: `color-mix(in srgb, ${c} 14%, transparent)`,
      color: c,
      border: '1px solid transparent'
    },
    outline: {
      background: 'transparent',
      color: c,
      border: `1.5px solid ${c}`
    }
  };
  const v = styles[variant] || styles.soft;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 22,
      padding: dot ? '0 9px 0 8px' : '0 9px',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 11,
      letterSpacing: '0.02em',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      ...v,
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'currentColor',
      animation: tone === 'live' ? 'tc-pulse 1.4s var(--ease-in-out) infinite' : 'none'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes tc-pulse{0%,100%{opacity:1}50%{opacity:0.35}}')), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TryCast Button.
 * Variants: primary (grenat spark — CTA only), secondary (outlined),
 * ghost (text). Sizes: sm | md | lg. States: default/pressed/disabled/loading.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leadingIcon = null,
  fullWidth = false,
  onClick,
  style,
  ...rest
}) {
  const [pressed, setPressed] = React.useState(false);
  const isDisabled = disabled || loading;
  const sizes = {
    sm: {
      h: 36,
      px: 14,
      fs: 13,
      gap: 6
    },
    md: {
      h: 48,
      px: 20,
      fs: 15,
      gap: 8
    },
    lg: {
      h: 56,
      px: 26,
      fs: 16,
      gap: 10
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: pressed ? 'var(--accent-press)' : 'var(--accent)',
      color: 'var(--on-accent)',
      border: '1px solid transparent',
      boxShadow: pressed ? 'none' : 'var(--glow-accent)'
    },
    secondary: {
      background: 'transparent',
      color: 'var(--text)',
      border: '1.5px solid var(--border-strong)',
      boxShadow: 'none'
    },
    ghost: {
      background: pressed ? 'color-mix(in srgb, var(--text) 8%, transparent)' : 'transparent',
      color: 'var(--text)',
      border: '1px solid transparent',
      boxShadow: 'none'
    }
  };
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: isDisabled,
    onClick: onClick,
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.h,
      minWidth: s.h,
      padding: `0 ${s.px}px`,
      width: fullWidth ? '100%' : undefined,
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: s.fs,
      lineHeight: 1,
      borderRadius: 'var(--radius-pill)',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.45 : 1,
      transform: pressed && !isDisabled ? 'scale(0.97)' : 'scale(1)',
      transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), box-shadow var(--dur) var(--ease-out)',
      WebkitTapHighlightColor: 'transparent',
      ...v,
      ...style
    }
  }, rest), loading ? /*#__PURE__*/React.createElement(Spinner, {
    color: v.color
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, leadingIcon, children));
}
function Spinner({
  color
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: '50%',
      border: `2px solid color-mix(in srgb, ${color} 30%, transparent)`,
      borderTopColor: color,
      display: 'inline-block',
      animation: 'tc-spin 0.7s linear infinite'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes tc-spin{to{transform:rotate(360deg)}}'));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Chip — compact filter / choice pill. Toggle-able (selected uses grenat spark).
 * variant: filter (default) | choice
 */
function Chip({
  children,
  selected = false,
  disabled = false,
  leadingIcon = null,
  onClick,
  style,
  ...rest
}) {
  const [pressed, setPressed] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onClick: onClick,
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 34,
      padding: '0 14px',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 13,
      lineHeight: 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      background: selected ? 'var(--accent)' : 'transparent',
      color: selected ? 'var(--on-accent)' : 'var(--text)',
      border: selected ? '1.5px solid transparent' : '1.5px solid var(--border-strong)',
      transform: pressed && !disabled ? 'scale(0.95)' : 'scale(1)',
      transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)',
      WebkitTapHighlightColor: 'transparent',
      ...style
    }
  }, rest), leadingIcon, children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * IconButton — square/circular tappable icon. For toolbar & header actions.
 * Variants: solid (grenat), soft (tinted surface), ghost (transparent).
 */
function IconButton({
  children,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  round = true,
  ariaLabel,
  onClick,
  style,
  ...rest
}) {
  const [pressed, setPressed] = React.useState(false);
  const dims = {
    sm: 36,
    md: 44,
    lg: 52
  }[size] || 44;
  const variants = {
    solid: {
      background: pressed ? 'var(--accent-press)' : 'var(--accent)',
      color: 'var(--on-accent)',
      border: '1px solid transparent'
    },
    soft: {
      background: 'color-mix(in srgb, var(--text) 6%, transparent)',
      color: 'var(--text)',
      border: '1px solid transparent'
    },
    ghost: {
      background: pressed ? 'color-mix(in srgb, var(--text) 8%, transparent)' : 'transparent',
      color: 'var(--text)',
      border: '1px solid transparent'
    },
    outline: {
      background: 'transparent',
      color: 'var(--text)',
      border: '1.5px solid var(--border-strong)'
    }
  };
  const v = variants[variant] || variants.ghost;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": ariaLabel,
    disabled: disabled,
    onClick: onClick,
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: dims,
      height: dims,
      borderRadius: round ? 'var(--radius-pill)' : 'var(--radius-sm)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transform: pressed && !disabled ? 'scale(0.92)' : 'scale(1)',
      transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)',
      WebkitTapHighlightColor: 'transparent',
      ...v,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — text field with label, helper/error, states.
 */
function Input({
  label,
  value,
  placeholder,
  helper,
  error,
  disabled = false,
  type = 'text',
  leadingIcon = null,
  trailing = null,
  onChange,
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const borderColor = error ? 'var(--accent)' : focused ? 'var(--brand)' : 'var(--border-strong)';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      width: '100%',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 48,
      padding: '0 14px',
      background: disabled ? 'var(--surface-sunken)' : 'var(--surface)',
      border: `1.5px solid ${borderColor}`,
      borderRadius: 'var(--radius-sm)',
      boxShadow: focused && !error ? '0 0 0 3px color-mix(in srgb, var(--brand) 14%, transparent)' : 'none',
      transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      opacity: disabled ? 0.6 : 1
    }
  }, leadingIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      color: 'var(--text-faint)'
    }
  }, leadingIcon), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    placeholder: placeholder,
    disabled: disabled,
    onChange: onChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      color: 'var(--text)'
    }
  }, rest)), trailing), (helper || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      color: error ? 'var(--accent)' : 'var(--text-faint)'
    }
  }, error || helper));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/SegmentedControl.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SegmentedControl — iOS-style segmented tabs. Values switch a view.
 * Selected segment rides a sliding thumb.
 */
function SegmentedControl({
  options = [],
  value,
  onChange,
  size = 'md',
  style,
  ...rest
}) {
  const idx = Math.max(0, options.findIndex(o => (o.value ?? o) === value));
  const h = size === 'sm' ? 34 : 40;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: `repeat(${options.length}, 1fr)`,
      gap: 2,
      padding: 3,
      height: h,
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-pill)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      position: 'absolute',
      top: 3,
      bottom: 3,
      left: `calc(${idx / options.length * 100}% + 3px)`,
      width: `calc(${100 / options.length}% - 6px)`,
      background: 'var(--surface)',
      borderRadius: 'var(--radius-pill)',
      boxShadow: 'var(--shadow-sm)',
      transition: 'left var(--dur) var(--ease-out)'
    }
  }), options.map(o => {
    const v = o.value ?? o;
    const label = o.label ?? o;
    const active = v === value;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      type: "button",
      onClick: () => onChange && onChange(v),
      style: {
        position: 'relative',
        zIndex: 1,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontWeight: 'var(--fw-semibold)',
        fontSize: size === 'sm' ? 12 : 13,
        color: active ? 'var(--text)' : 'var(--text-faint)',
        transition: 'color var(--dur) var(--ease-out)',
        WebkitTapHighlightColor: 'transparent'
      }
    }, label);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/core/Skeleton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Skeleton — loading placeholder. variant: line | block | circle
 */
function Skeleton({
  variant = 'line',
  width,
  height,
  style,
  ...rest
}) {
  const base = {
    line: {
      width: width || '100%',
      height: height || 12,
      borderRadius: 'var(--radius-xs)'
    },
    block: {
      width: width || '100%',
      height: height || 80,
      borderRadius: 'var(--radius-md)'
    },
    circle: {
      width: width || 40,
      height: height || width || 40,
      borderRadius: '50%'
    }
  }[variant];
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": true,
    style: {
      display: 'block',
      background: 'linear-gradient(90deg, color-mix(in srgb, var(--text) 8%, transparent) 25%, color-mix(in srgb, var(--text) 14%, transparent) 37%, color-mix(in srgb, var(--text) 8%, transparent) 63%)',
      backgroundSize: '400% 100%',
      animation: 'tc-shimmer 1.4s ease infinite',
      ...base,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("style", null, '@keyframes tc-shimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}'));
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EmptyState — friendly zero-data placeholder. Icon/illustration slot + title
 * (Anton) + message + optional action button (pass a <Button/>).
 */
function EmptyState({
  icon = null,
  title,
  message,
  action = null,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 12,
      padding: '40px 28px',
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 72,
      height: 72,
      borderRadius: 'var(--radius-pill)',
      background: 'color-mix(in srgb, var(--brand) 10%, transparent)',
      color: 'var(--brand)',
      marginBottom: 4
    }
  }, icon), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-regular)',
      fontSize: 22,
      letterSpacing: '0.02em',
      color: 'var(--text)'
    }
  }, title), message && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 280,
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      lineHeight: 1.5,
      color: 'var(--text-muted)',
      textWrap: 'pretty'
    }
  }, message), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, action));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Toast — transient notification. tone: neutral | success | accent | live
 * Icon + message + optional action.
 */
function Toast({
  message,
  tone = 'neutral',
  icon = null,
  action = null,
  onAction,
  style,
  ...rest
}) {
  const accentMap = {
    neutral: 'var(--text)',
    success: 'var(--success-500)',
    accent: 'var(--accent)',
    live: 'var(--status-live)'
  };
  const stripe = accentMap[tone] || accentMap.neutral;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      maxWidth: 380,
      padding: '12px 14px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${stripe}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: `var(--shadow-lg), 0 6px 22px color-mix(in srgb, ${stripe} 28%, transparent)`,
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      color: stripe,
      flexShrink: 0
    }
  }, icon), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--text)',
      lineHeight: 1.35
    }
  }, message), action && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onAction,
    style: {
      border: 'none',
      background: 'transparent',
      color: 'var(--accent)',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 13,
      cursor: 'pointer',
      flexShrink: 0,
      WebkitTapHighlightColor: 'transparent'
    }
  }, action));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Header.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Header — screen top bar. Title (Anton) with optional back + trailing action.
 * variant: default (surface) | brand (green) | transparent
 */
function Header({
  title,
  onBack = null,
  trailing = null,
  variant = 'default',
  style,
  ...rest
}) {
  const bg = {
    default: 'var(--bg)',
    brand: 'var(--brand)',
    transparent: 'transparent'
  }[variant];
  const fg = variant === 'brand' ? 'var(--on-brand)' : 'var(--text)';
  return /*#__PURE__*/React.createElement("header", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      height: 56,
      padding: '0 8px 0 4px',
      background: bg,
      color: fg,
      ...style
    }
  }, rest), onBack && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Retour",
    onClick: onBack,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 44,
      border: 'none',
      background: 'transparent',
      color: 'inherit',
      cursor: 'pointer',
      WebkitTapHighlightColor: 'transparent'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M15 18l-6-6 6-6"
  }))), /*#__PURE__*/React.createElement("h1", {
    style: {
      flex: 1,
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--fw-regular)',
      fontSize: 24,
      letterSpacing: '0.01em',
      paddingLeft: onBack ? 0 : 12
    }
  }, title), trailing && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, trailing));
}
Object.assign(__ds_scope, { Header });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Header.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TabBar — bottom navigation (mobile). Floating variant is a translucent,
 * blurred glass bar (very rounded, soft shadow); the active tab is a light
 * glass pill at the same height (icon + label tint grenat).
 * `floating={false}` docks it edge-to-edge (solid surface).
 * `floating` (default) detaches the bar from the screen edges with margins,
 * a pill radius and a shadow; `floating={false}` docks it edge-to-edge.
 * items: [{ key, label, icon }]. Provide icon as a render fn (active:bool)=>node
 * or a static node.
 */
function TabBar({
  items = [],
  active,
  onChange,
  floating = true,
  style,
  ...rest
}) {
  const floatStyle = floating ? {
    margin: '0 16px 16px',
    marginBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
    borderRadius: 34,
    border: '1px solid color-mix(in srgb, #ffffff 70%, transparent)',
    boxShadow: '0 16px 40px rgba(22, 19, 14, 0.14)',
    padding: 8,
    background: 'color-mix(in srgb, var(--surface) 60%, transparent)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)'
  } : {
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    borderTop: '1px solid var(--border)',
    padding: 6,
    background: 'var(--surface)'
  };
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      alignItems: 'stretch',
      gap: 4,
      overflow: 'visible',
      ...floatStyle,
      ...style
    }
  }, rest), items.map(it => {
    const isActive = it.key === active;
    const color = isActive ? 'var(--accent)' : 'var(--text-faint)';
    const activeBg = floating ? 'color-mix(in srgb, #ffffff 55%, transparent)' : 'var(--surface)';
    return /*#__PURE__*/React.createElement("button", {
      key: it.key,
      type: "button",
      onClick: () => onChange && onChange(it.key),
      style: {
        display: 'flex',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flex: 1,
        padding: '12px 8px',
        borderRadius: 28,
        color,
        background: isActive ? activeBg : 'transparent',
        border: `1px solid ${isActive && floating ? 'color-mix(in srgb, #ffffff 50%, transparent)' : 'transparent'}`,
        boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
        transition: 'background var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out), color var(--dur-fast) var(--ease-out)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        width: 24,
        height: 24
      }
    }, typeof it.icon === 'function' ? it.icon(isActive) : it.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-body)',
        fontWeight: 'var(--fw-bold)',
        fontSize: 10,
        letterSpacing: '0.03em'
      }
    }, it.label)));
  }));
}
Object.assign(__ds_scope, { TabBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// components/rugby/CompetitionBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * CompetitionBadge — NEUTRAL competition label (no official league logo).
 * A small pill combining a generic mark and the competition name.
 * tone: neutral (default) | brand
 */
function CompetitionBadge({
  label,
  tone = 'neutral',
  size = 'md',
  style,
  ...rest
}) {
  const h = size === 'sm' ? 20 : 24;
  const fs = size === 'sm' ? 10.5 : 11.5;
  const isBrand = tone === 'brand';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: h,
      padding: `0 10px 0 8px`,
      borderRadius: 'var(--radius-pill)',
      background: isBrand ? 'color-mix(in srgb, var(--brand) 12%, transparent)' : 'var(--surface-sunken)',
      border: '1px solid var(--border)',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: fs,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: isBrand ? 'var(--brand)' : 'var(--text-muted)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: fs,
    height: fs,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "12",
    cy: "12",
    rx: "10",
    ry: "6.5",
    transform: "rotate(-30 12 12)",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4"
  })), label);
}
Object.assign(__ds_scope, { CompetitionBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/rugby/CompetitionBadge.jsx", error: String((e && e.message) || e) }); }

// components/rugby/RankingRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * RankingRow — one leaderboard line: rank, player, points, movement.
 * change: number (positions gained/lost, 0 = steady) or 'new'.
 * highlight = true renders the current user's row (grenat left edge).
 */
function RankingRow({
  rank,
  name,
  points,
  change = 0,
  avatarSrc = null,
  highlight = false,
  style,
  ...rest
}) {
  const isNew = change === 'new';
  const up = typeof change === 'number' && change > 0;
  const down = typeof change === 'number' && change < 0;
  const moveColor = up ? 'var(--success-500)' : down ? 'var(--accent)' : 'var(--text-faint)';
  const podium = rank <= 3;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 14px',
      background: highlight ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : 'var(--surface)',
      borderLeft: highlight ? '3px solid var(--accent)' : '3px solid transparent',
      borderRadius: 'var(--radius-sm)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 28,
      textAlign: 'center',
      fontFamily: 'var(--font-display)',
      fontSize: 20,
      lineHeight: 1,
      color: podium ? 'var(--brand)' : 'var(--text-muted)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, rank), /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: name,
    src: avatarSrc,
    size: "sm",
    ring: highlight
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-body)',
      fontWeight: highlight ? 'var(--fw-bold)' : 'var(--fw-semibold)',
      fontSize: 15,
      color: 'var(--text)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name, highlight ? ' · toi' : ''), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      minWidth: 40,
      justifyContent: 'flex-end',
      color: moveColor,
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 12
    }
  }, isNew ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      letterSpacing: '0.04em',
      textTransform: 'uppercase'
    }
  }, "New") : up ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Caret, {
    dir: "up"
  }), change) : down ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Caret, {
    dir: "down"
  }), Math.abs(change)) : /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-faint)'
    }
  }, "\u2014")), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 56,
      textAlign: 'right',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-bold)',
      fontSize: 16,
      color: 'var(--text)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, points));
}
function Caret({
  dir
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: "10",
    height: "10",
    viewBox: "0 0 12 12",
    fill: "currentColor",
    "aria-hidden": true
  }, dir === 'up' ? /*#__PURE__*/React.createElement("path", {
    d: "M6 2l4 6H2z"
  }) : /*#__PURE__*/React.createElement("path", {
    d: "M6 10L2 4h8z"
  }));
}
Object.assign(__ds_scope, { RankingRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/rugby/RankingRow.jsx", error: String((e && e.message) || e) }); }

// components/rugby/ScoreStepper.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ScoreStepper — big tappable −/＋ stepper for an exact score value.
 * Label above (team abbr/name), large Anton number in the middle.
 */
function ScoreStepper({
  label,
  value = 0,
  min = 0,
  max = 199,
  onChange,
  accentColor = 'var(--brand)',
  style,
  ...rest
}) {
  const set = n => onChange && onChange(Math.max(min, Math.min(max, n)));
  const Btn = ({
    dir,
    children
  }) => {
    const [p, setP] = React.useState(false);
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": dir > 0 ? 'Augmenter' : 'Diminuer',
      onClick: () => set(value + dir),
      onPointerDown: () => setP(true),
      onPointerUp: () => setP(false),
      onPointerLeave: () => setP(false),
      style: {
        width: 44,
        height: 44,
        borderRadius: 'var(--radius-pill)',
        border: '1.5px solid var(--border-strong)',
        background: 'var(--surface)',
        color: 'var(--text)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: p ? 'scale(0.9)' : 'scale(1)',
        transition: 'transform var(--dur-fast) var(--ease-out)',
        WebkitTapHighlightColor: 'transparent'
      }
    }, children);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: accentColor
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 13,
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }
  }, label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    dir: -1
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: "2.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 60,
      textAlign: 'center',
      fontFamily: 'var(--font-display)',
      fontSize: 48,
      lineHeight: 1,
      color: 'var(--text)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, value), /*#__PURE__*/React.createElement(Btn, {
    dir: 1
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: "2.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "5",
    x2: "12",
    y2: "19"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  })))));
}
Object.assign(__ds_scope, { ScoreStepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/rugby/ScoreStepper.jsx", error: String((e && e.message) || e) }); }

// components/rugby/TeamFlag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Built-in national flag definitions (IP-neutral — national flags only).
 * dir: 'v' vertical bands | 'h' horizontal bands. Add more as needed.
 */
const FLAGS = {
  FRA: {
    dir: 'v',
    colors: ['#2C5697', '#FFFFFF', '#E1000F']
  },
  IRL: {
    dir: 'v',
    colors: ['#169B62', '#FFFFFF', '#FF883E']
  },
  ITA: {
    dir: 'v',
    colors: ['#009246', '#FFFFFF', '#CE2B37']
  },
  BEL: {
    dir: 'v',
    colors: ['#000000', '#FFD90C', '#F31830']
  },
  ROU: {
    dir: 'v',
    colors: ['#002B7F', '#FCD116', '#CE1126']
  },
  NED: {
    dir: 'h',
    colors: ['#AE1C28', '#FFFFFF', '#21468B']
  },
  GER: {
    dir: 'h',
    colors: ['#000000', '#DD0000', '#FFCE00']
  },
  ARG: {
    dir: 'h',
    colors: ['#74ACDF', '#FFFFFF', '#74ACDF']
  }
};

/**
 * TeamFlag — IP-neutral team marker. The nation's flag lives INSIDE the TryCast
 * ball symbol (clipped to the oval), echoing the brand mark — never a tile
 * around it, never a licensed club logo.
 * Pass `flag` ({dir, colors}) or rely on the built-in FLAGS map keyed by `abbr`.
 * Teams with no flag definition fall back to a solid-color ball + abbreviation.
 */
function TeamFlag({
  abbr = '',
  flag = null,
  color = 'var(--brand)',
  size = 'md',
  style,
  ...rest
}) {
  const [uid] = React.useState(() => 'tf' + Math.random().toString(36).slice(2, 9));
  const dims = {
    sm: 30,
    md: 46,
    lg: 62
  }[size] || 46;
  const def = flag || FLAGS[abbr.toUpperCase()] || null;
  const code = abbr.slice(0, 3).toUpperCase();

  // viewBox 108 x 96 — ball centered, speed trail to the lower-left
  const CX = 58,
    CY = 50,
    RX = 33,
    RY = 19,
    ROT = -22;
  const rot = `rotate(${ROT} ${CX} ${CY})`;
  const primary = def ? def.colors[0] : color;

  // flag bands, clipped to the ellipse (bbox padded generously)
  let bands = null;
  if (def) {
    const n = def.colors.length;
    if (def.dir === 'h') {
      const bh = 78 / n,
        y0 = 11;
      bands = def.colors.map((c, i) => /*#__PURE__*/React.createElement("rect", {
        key: i,
        x: "10",
        y: y0 + i * bh,
        width: "96",
        height: bh + 0.5,
        fill: c
      }));
    } else {
      const bw = 92 / n,
        x0 = 12;
      bands = def.colors.map((c, i) => /*#__PURE__*/React.createElement("rect", {
        key: i,
        x: x0 + i * bw,
        y: "10",
        width: bw + 0.5,
        height: "80",
        fill: c
      }));
    }
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    title: code,
    style: {
      display: 'inline-flex',
      flexShrink: 0,
      lineHeight: 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: dims,
    height: dims * (96 / 108),
    viewBox: "0 0 108 96",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("clipPath", {
    id: uid
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: CX,
    cy: CY,
    rx: RX,
    ry: RY,
    transform: rot
  }))), /*#__PURE__*/React.createElement("g", {
    transform: rot
  }, /*#__PURE__*/React.createElement("line", {
    x1: CX - RX - 2,
    y1: CY,
    x2: CX - RX - 26,
    y2: CY,
    stroke: primary,
    strokeWidth: "6",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("line", {
    x1: CX - RX,
    y1: CY - 11,
    x2: CX - RX - 20,
    y2: CY - 11,
    stroke: primary,
    strokeWidth: "4",
    strokeLinecap: "round",
    opacity: "0.55"
  }), /*#__PURE__*/React.createElement("line", {
    x1: CX - RX,
    y1: CY + 11,
    x2: CX - RX - 20,
    y2: CY + 11,
    stroke: primary,
    strokeWidth: "4",
    strokeLinecap: "round",
    opacity: "0.55"
  })), def ? /*#__PURE__*/React.createElement("g", {
    clipPath: `url(#${uid})`
  }, bands) : /*#__PURE__*/React.createElement("ellipse", {
    cx: CX,
    cy: CY,
    rx: RX,
    ry: RY,
    transform: rot,
    fill: color
  }), /*#__PURE__*/React.createElement("g", {
    transform: rot
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: CX,
    cy: CY,
    rx: RX,
    ry: RY,
    fill: "none",
    stroke: "rgba(0,0,0,0.18)",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: CX - RX + 4,
    y1: CY,
    x2: CX + RX - 4,
    y2: CY,
    stroke: "#F1EBDD",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }), [-14, -7, 0, 7, 14].map(dx => /*#__PURE__*/React.createElement("line", {
    key: dx,
    x1: CX + dx,
    y1: CY - 5,
    x2: CX + dx,
    y2: CY + 5,
    stroke: "#F1EBDD",
    strokeWidth: "2",
    strokeLinecap: "round"
  }))), !def && code && /*#__PURE__*/React.createElement("text", {
    x: CX,
    y: CY,
    textAnchor: "middle",
    dominantBaseline: "central",
    fontFamily: "Inter, sans-serif",
    fontWeight: "700",
    fontSize: "15",
    fill: "#F1EBDD"
  }, code)));
}
Object.assign(__ds_scope, { FLAGS, TeamFlag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/rugby/TeamFlag.jsx", error: String((e && e.message) || e) }); }

// components/rugby/MatchCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MatchCard — a fixture: two teams, competition, status. Upcoming fixtures are
 * handled by the prediction card, so MatchCard is used for live & finished matches.
 * status: 'live' | 'finished' (also accepts 'upcoming' for legacy use)
 * home/away: { abbr, name, color, score? }
 * prediction: { home, away, bonusHome?, bonusAway? } — shows the user's prono,
 *   selected offensive bonuses, and points (potential when live, gained when finished).
 * points: number — potential (live) or gained (finished).
 */
function MatchCard({
  home,
  away,
  competition,
  kickoff,
  // display string, e.g. "Sam. 8 fév · 21h00"
  status = 'upcoming',
  prediction = null,
  // { home, away, bonusHome, bonusAway }
  points = null,
  // potential (live) or gained (finished)
  minute = null,
  // live clock, e.g. "58'"
  onPress,
  style,
  ...rest
}) {
  const isLive = status === 'live';
  const isFinished = status === 'finished';
  const showScore = isLive || isFinished;
  const statusEl = isLive ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      color: 'var(--status-live)',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-bold)',
      fontSize: 11,
      letterSpacing: '0.06em'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'var(--status-live)',
      animation: 'tc-live 1.4s ease-in-out infinite'
    }
  }), "LIVE ", minute, /*#__PURE__*/React.createElement("style", null, '@keyframes tc-live{0%,100%{opacity:1}50%{opacity:.35}}')) : isFinished ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 11,
      letterSpacing: '0.06em',
      color: 'var(--text-faint)',
      textTransform: 'uppercase'
    }
  }, "Termin\xE9") : /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-medium)',
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, kickoff);
  const Row = ({
    team
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.TeamFlag, {
    abbr: team.abbr,
    color: team.color,
    size: "md"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 16,
      color: 'var(--text)'
    }
  }, team.name), showScore && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 26,
      lineHeight: 1,
      color: 'var(--text)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, team.score ?? 0));
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onPress,
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      padding: 16,
      background: 'var(--surface)',
      border: isLive ? '1.5px solid color-mix(in srgb, var(--status-live) 40%, var(--border))' : '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: isLive ? 'var(--glow-accent)' : 'var(--shadow-sm)',
      cursor: onPress ? 'pointer' : 'default',
      WebkitTapHighlightColor: 'transparent',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.CompetitionBadge, {
    label: competition,
    size: "sm"
  }), statusEl), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Row, {
    team: home
  }), /*#__PURE__*/React.createElement(Row, {
    team: away
  })), prediction && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      marginTop: 14,
      paddingTop: 12,
      borderTop: '1px dashed var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 11,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, "Ton prono"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 10px',
      borderRadius: 'var(--radius-pill)',
      background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
      color: 'var(--accent)',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-bold)',
      fontSize: 13,
      fontVariantNumeric: 'tabular-nums'
    }
  }, prediction.home, " \u2013 ", prediction.away), prediction.bonusHome && /*#__PURE__*/React.createElement(BonusTag, {
    abbr: home.abbr
  }), prediction.bonusAway && /*#__PURE__*/React.createElement(BonusTag, {
    abbr: away.abbr
  })), points != null && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 11,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, isFinished ? 'Points gagnés' : 'Points potentiels'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
      color: isFinished ? 'var(--success-500)' : 'var(--text)'
    }
  }, isFinished ? '+' : '', points))));
}

/** BonusTag — compact grenat pill marking a selected offensive bonus. */
function BonusTag({
  abbr
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 9px',
      borderRadius: 'var(--radius-pill)',
      border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
      color: 'var(--accent)',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 11,
      letterSpacing: '0.02em'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 5,
      height: 5,
      borderRadius: '50%',
      background: 'var(--accent)'
    }
  }), abbr, " bonus");
}
Object.assign(__ds_scope, { MatchCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/rugby/MatchCard.jsx", error: String((e && e.message) || e) }); }

// components/rugby/ScorePrediction.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * BonusToggle — a single offensive/defensive bonus switch (selected = grenat spark).
 * Full-width row; use standalone. ScorePrediction uses its own compact inline cells.
 */
function BonusToggle({
  label,
  hint,
  checked = false,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": checked,
    onClick: () => onChange && onChange(!checked),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      padding: '12px 14px',
      textAlign: 'left',
      background: checked ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface)',
      border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
      WebkitTapHighlightColor: 'transparent',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 14,
      color: 'var(--text)'
    }
  }, label), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, hint)), /*#__PURE__*/React.createElement(MiniSwitch, {
    checked: checked
  }));
}
function MiniSwitch({
  checked
}) {
  return /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      position: 'relative',
      width: 42,
      height: 26,
      borderRadius: 'var(--radius-pill)',
      background: checked ? 'var(--accent)' : 'var(--border-strong)',
      flexShrink: 0,
      transition: 'background var(--dur) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: checked ? 19 : 3,
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: 'var(--shadow-sm)',
      transition: 'left var(--dur) var(--ease-out)'
    }
  }));
}

/** ScoreField — big editable numeric score for one team (1–3 digits). */
function ScoreField({
  team,
  value,
  onChange
}) {
  const [focused, setFocused] = React.useState(false);
  const handle = e => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
    onChange && onChange(digits === '' ? 0 : Math.min(199, parseInt(digits, 10)));
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.TeamFlag, {
    abbr: team.abbr,
    flag: team.flag,
    color: team.color,
    size: "lg"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 12,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, team.abbr), /*#__PURE__*/React.createElement("input", {
    type: "text",
    inputMode: "numeric",
    "aria-label": `Score ${team.name}`,
    value: value,
    onChange: handle,
    onFocus: e => {
      setFocused(true);
      e.target.select();
    },
    onBlur: () => setFocused(false),
    style: {
      width: 92,
      textAlign: 'center',
      fontFamily: 'var(--font-display)',
      fontSize: 52,
      lineHeight: 1,
      color: 'var(--text)',
      fontVariantNumeric: 'tabular-nums',
      background: 'var(--surface-sunken)',
      border: `2px solid ${focused ? 'var(--brand)' : 'transparent'}`,
      borderRadius: 'var(--radius-md)',
      outline: 'none',
      padding: '6px 4px',
      transition: 'border-color var(--dur-fast) var(--ease-out)',
      WebkitTapHighlightColor: 'transparent'
    }
  }));
}

/** BonusMini — minimal inline bonus toggle: team abbr + switch, nothing else. */
function BonusMini({
  team,
  checked,
  onChange
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": checked,
    "aria-label": `Bonus offensif ${team.name}`,
    onClick: () => onChange && onChange(!checked),
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      flex: 1,
      minWidth: 0,
      padding: '8px 12px',
      background: checked ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface)',
      border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
      WebkitTapHighlightColor: 'transparent'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-bold)',
      fontSize: 13,
      letterSpacing: '0.02em',
      color: 'var(--text)'
    }
  }, team.abbr), /*#__PURE__*/React.createElement(MiniSwitch, {
    checked: checked
  }));
}

/** PtCell — one 1N2 potential-points cell; active outcome gets the grenat edge. */
function PtCell({
  k,
  v,
  active
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      padding: '8px 4px',
      background: active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface-sunken)',
      border: `1.5px solid ${active ? 'var(--accent)' : 'transparent'}`,
      borderRadius: 'var(--radius-sm)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-bold)',
      fontSize: 11,
      color: active ? 'var(--accent)' : 'var(--text-faint)'
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 22,
      lineHeight: 1,
      color: 'var(--text)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, v));
}

/**
 * ScorePrediction — the heart of TryCast. Editable exact-score inputs for both
 * teams (1–3 digits, no steppers) plus a single-line offensive-bonus row
 * (away on the left, home on the right). Emits the full prediction via onChange.
 * value: { home, away, bonusHome, bonusAway }
 */
function ScorePrediction({
  home = {
    abbr: 'DOM',
    name: 'Domicile',
    color: 'var(--brand)'
  },
  away = {
    abbr: 'EXT',
    name: 'Extérieur',
    color: 'var(--brand)'
  },
  value = {
    home: 0,
    away: 0,
    bonusHome: false,
    bonusAway: false
  },
  points1N2 = null,
  onChange,
  style,
  ...rest
}) {
  const patch = p => onChange && onChange({
    ...value,
    ...p
  });
  const outcome = value.home > value.away ? '1' : value.home < value.away ? '2' : 'N';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      padding: 20,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-md)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(ScoreField, {
    team: home,
    value: value.home,
    onChange: n => patch({
      home: n
    })
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 30,
      color: 'var(--text-faint)'
    }
  }, "\u2013"), /*#__PURE__*/React.createElement(ScoreField, {
    team: away,
    value: value.away,
    onChange: n => patch({
      away: n
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 11,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, "Bonus offensif"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, "4 essais +")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(BonusMini, {
    team: away,
    checked: value.bonusAway,
    onChange: c => patch({
      bonusAway: c
    })
  }), /*#__PURE__*/React.createElement(BonusMini, {
    team: home,
    checked: value.bonusHome,
    onChange: c => patch({
      bonusHome: c
    })
  }))), points1N2 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: 11,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, "Points potentiels \xB7 1 N 2"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(PtCell, {
    k: "1",
    v: points1N2['1'],
    active: outcome === '1'
  }), /*#__PURE__*/React.createElement(PtCell, {
    k: "N",
    v: points1N2['N'],
    active: outcome === 'N'
  }), /*#__PURE__*/React.createElement(PtCell, {
    k: "2",
    v: points1N2['2'],
    active: outcome === '2'
  }))));
}
Object.assign(__ds_scope, { BonusToggle, ScorePrediction });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/rugby/ScorePrediction.jsx", error: String((e && e.message) || e) }); }

// uploads/trycast-colors.ts
try { (() => {
/**
 * TryCast — tokens de couleur (Direction B · Grenat)
 * À importer dans tailwind.config.{js,ts} sous theme.extend.colors,
 * ou à consommer directement en TS.
 */

const palette = {
  green: {
    900: '#0E3320',
    // fond le plus profond / pressé
    800: '#14432A',
    // vert marque (surfaces sombres, brand)
    700: '#1C5638',
    // surface élevée (dark)
    600: '#26694A' // vert clair (bordures dark, accents discrets)
  },
  grenat: {
    600: '#C82E52',
    // accent pressé
    500: '#E63E63',
    // ACCENT — l'étincelle (CTA, live, prono sélectionné)
    400: '#F06485' // accent survol / clair (traîne du logo)
  },
  cream: {
    DEFAULT: '#F1EBDD',
    // papier / fond clair
    200: '#E7DFCC' // surface crème plus profonde, séparateurs
  },
  ink: {
    900: '#16130E',
    // texte principal sur clair (noir chaud)
    600: '#5A5245',
    // texte secondaire
    400: '#8A8071' // texte discret / placeholders
  }
};

/** Rôles sémantiques par thème — mappe ces valeurs à tes classes. */
const theme = {
  light: {
    bg: palette.cream.DEFAULT,
    surface: '#FBF7EF',
    border: palette.cream[200],
    text: palette.ink[900],
    textMuted: palette.ink[600],
    brand: palette.green[800],
    accent: palette.grenat[500]
  },
  dark: {
    bg: palette.green[900],
    surface: palette.green[800],
    border: palette.green[700],
    text: palette.cream.DEFAULT,
    textMuted: '#A9C0B2',
    brand: palette.cream.DEFAULT,
    accent: palette.grenat[500]
  }
};

/**
 * Extrait pour tailwind.config.ts :
 *
 * import { palette } from './src/theme/colors';
 * export default {
 *   theme: { extend: { colors: {
 *     brand:  palette.green,
 *     accent: palette.grenat,
 *     cream:  palette.cream,
 *     ink:    palette.ink,
 *   } } },
 * };
 *
 * → bg-brand-800, text-accent-500, border-cream-200, text-ink-900, etc.
 */
Object.assign(__ds_scope, { palette, theme });
})(); } catch (e) { __ds_ns.__errors.push({ path: "uploads/trycast-colors.ts", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Header = __ds_scope.Header;

__ds_ns.TabBar = __ds_scope.TabBar;

__ds_ns.CompetitionBadge = __ds_scope.CompetitionBadge;

__ds_ns.MatchCard = __ds_scope.MatchCard;

__ds_ns.RankingRow = __ds_scope.RankingRow;

__ds_ns.BonusToggle = __ds_scope.BonusToggle;

__ds_ns.ScorePrediction = __ds_scope.ScorePrediction;

__ds_ns.ScoreStepper = __ds_scope.ScoreStepper;

__ds_ns.FLAGS = __ds_scope.FLAGS;

__ds_ns.TeamFlag = __ds_scope.TeamFlag;

})();

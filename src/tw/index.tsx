import { Link as RouterLink } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator as RNActivityIndicator,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from 'react-native';
import { useCssElement, useNativeVariable as useFunctionalVariable } from 'react-native-css';

// CSS-enabled Link (cast: typed-routes prop unions are too complex for tsc)
export const Link = (props: React.ComponentProps<typeof RouterLink> & { className?: string }) => {
  return useCssElement(
    RouterLink as unknown as React.ComponentType<Record<string, unknown>>,
    props,
    {
      className: 'style',
    },
  );
};

Link.Trigger = RouterLink.Trigger;
Link.Menu = RouterLink.Menu;
Link.MenuAction = RouterLink.MenuAction;
Link.Preview = RouterLink.Preview;

// CSS Variable hook
export const useCSSVariable =
  process.env.EXPO_OS !== 'web' ? useFunctionalVariable : (variable: string) => `var(${variable})`;

export type ViewProps = React.ComponentProps<typeof RNView> & { className?: string };

export const View = (props: ViewProps) => {
  return useCssElement(RNView, props, { className: 'style' });
};
View.displayName = 'CSS(View)';

export const Text = (props: React.ComponentProps<typeof RNText> & { className?: string }) => {
  return useCssElement(RNText, props, { className: 'style' });
};
Text.displayName = 'CSS(Text)';

export const ScrollView = (
  props: React.ComponentProps<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  },
) => {
  return useCssElement(RNScrollView as React.ComponentType<Record<string, unknown>>, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  });
};
ScrollView.displayName = 'CSS(ScrollView)';

export const Pressable = (
  props: React.ComponentProps<typeof RNPressable> & { className?: string },
) => {
  return useCssElement(RNPressable as React.ComponentType<Record<string, unknown>>, props, {
    className: 'style',
  });
};
Pressable.displayName = 'CSS(Pressable)';

export const TextInput = (
  props: React.ComponentProps<typeof RNTextInput> & { className?: string },
) => {
  return useCssElement(RNTextInput, props, { className: 'style' });
};
TextInput.displayName = 'CSS(TextInput)';

export const ActivityIndicator = (
  props: React.ComponentProps<typeof RNActivityIndicator> & { className?: string },
) => {
  return useCssElement(RNActivityIndicator, props, { className: 'style' });
};
ActivityIndicator.displayName = 'CSS(ActivityIndicator)';

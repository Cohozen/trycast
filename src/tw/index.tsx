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
import { useCssElement } from 'react-native-css';

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

// Couleurs du DS lues côté JS (icônes, placeholders, spinners…)
export { useThemeColor } from './use-theme-color';
export type { ThemeColorToken } from './palette';

export type ViewProps = React.ComponentProps<typeof RNView> & { className?: string };

export const View = (props: ViewProps) => {
    return useCssElement(RNView, props, { className: 'style' });
};
View.displayName = 'CSS(View)';

export const Text = (props: React.ComponentProps<typeof RNText> & { className?: string }) => {
    return useCssElement(RNText, props, { className: 'style' });
};
Text.displayName = 'CSS(Text)';

export const ScrollView = ({
    contentContainerStyle,
    ...props
}: React.ComponentProps<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
}) => {
    const element = useCssElement(
        RNScrollView as React.ComponentType<Record<string, unknown>>,
        props,
        {
            className: 'style',
            contentContainerClassName: 'contentContainerStyle',
        },
    );
    if (contentContainerStyle == null) {
        return element;
    }
    // react-native-css ne fusionne classes + inline que pour la cible `style` :
    // un contentContainerStyle inline écraserait tout le style dérivé de
    // contentContainerClassName. On fusionne donc ici, après résolution des classes.
    if (element.type !== RNScrollView) {
        // Élément enveloppé (provider de variables/containers) : cas non prévu.
        if (__DEV__) {
            console.warn(
                'tw/ScrollView : contentContainerStyle ignoré (élément enveloppé par react-native-css)',
            );
        }
        return element;
    }
    const resolved = (element.props as { contentContainerStyle?: unknown }).contentContainerStyle;
    return React.cloneElement(element as React.ReactElement<Record<string, unknown>>, {
        contentContainerStyle: [resolved, contentContainerStyle],
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

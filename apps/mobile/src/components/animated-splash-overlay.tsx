import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { palette } from '@/tw/palette';

const DURATION = 600;
// Même image et même taille que le splash natif (imageWidth d'app.json),
// pour que la bascule splash système → overlay soit invisible.
const SPLASH_ICON_SIZE = 96;

export function AnimatedSplashOverlay() {
    const [animate, setAnimate] = useState(false);
    const [visible, setVisible] = useState(true);
    const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';

    if (!visible) return null;

    const splashKeyframe = new Keyframe({
        0: {
            transform: [{ scale: 1 }],
            opacity: 1,
        },
        20: {
            opacity: 1,
        },
        70: {
            opacity: 0,
            easing: Easing.elastic(0.7),
        },
        100: {
            opacity: 0,
            transform: [{ scale: 1 }],
            easing: Easing.elastic(0.7),
        },
    });

    const overlayStyle = [styles.splashOverlay, { backgroundColor: palette.bg[colorScheme] }];
    const image = (
        <Image style={styles.image} source={require('@/assets/images/splash-icon.png')} />
    );

    return animate ? (
        <Animated.View
            entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
                'worklet';
                if (finished) {
                    scheduleOnRN(setVisible, false);
                }
            })}
            style={overlayStyle}>
            {image}
        </Animated.View>
    ) : (
        <View
            onLayout={() => {
                SplashScreen.hideAsync().finally(() => {
                    setAnimate(true);
                });
            }}
            style={overlayStyle}>
            {image}
        </View>
    );
}

const styles = StyleSheet.create({
    image: {
        width: SPLASH_ICON_SIZE,
        height: SPLASH_ICON_SIZE,
    },
    splashOverlay: {
        ...StyleSheet.absoluteFill,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
});

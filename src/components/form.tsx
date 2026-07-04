import React from 'react';

import { ActivityIndicator, Pressable, Text, TextInput, View } from '@/tw';

type FormFieldProps = React.ComponentProps<typeof TextInput> & {
    label: string;
    error?: string | null;
};

export function FormField({ label, error, ...inputProps }: FormFieldProps) {
    return (
        <View className="gap-1.5">
            <Text className="text-sm font-medium text-gray-700">{label}</Text>
            <TextInput
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
                placeholderTextColor="#9CA3AF"
                {...inputProps}
            />
            {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
        </View>
    );
}

type PrimaryButtonProps = {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'danger';
};

export function PrimaryButton({
    title,
    onPress,
    loading = false,
    disabled = false,
    variant = 'primary',
}: PrimaryButtonProps) {
    const background =
        variant === 'danger' ? 'bg-red-600 active:bg-red-700' : 'bg-blue-600 active:bg-blue-700';
    return (
        <Pressable
            className={`items-center justify-center rounded-xl px-4 py-3.5 ${background} ${
                disabled || loading ? 'opacity-50' : ''
            }`}
            disabled={disabled || loading}
            onPress={onPress}>
            {loading ? (
                <ActivityIndicator color="white" />
            ) : (
                <Text className="text-base font-semibold text-white">{title}</Text>
            )}
        </Pressable>
    );
}

export function FormBanner({ message, tone }: { message: string; tone: 'error' | 'success' }) {
    return (
        <View className={`rounded-xl px-4 py-3 ${tone === 'error' ? 'bg-red-50' : 'bg-green-50'}`}>
            <Text className={`text-sm ${tone === 'error' ? 'text-red-700' : 'text-green-700'}`}>
                {message}
            </Text>
        </View>
    );
}

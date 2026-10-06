import { Animated, Pressable } from 'react-native';
import React, { useRef } from 'react';

// Bottom tab button without Android's grey ripple. Instead the tab shrinks slightly
// while pressed and springs back on release.
const TabBarButton = ({ children, style, onPressIn, onPressOut, ...props }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = value =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 8 }).start();

  return (
    <Pressable
      {...props}
      android_ripple={null}
      style={style}
      onPressIn={e => {
        animateTo(0.9);
        onPressIn?.(e);
      }}
      onPressOut={e => {
        animateTo(1);
        onPressOut?.(e);
      }}
    >
      <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default TabBarButton;

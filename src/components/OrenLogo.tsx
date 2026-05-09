import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'

export default function OrenLogo({ size = 36, color = '#2563eb' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="18" r="15" stroke={color} strokeWidth="2.5" />
      <Circle cx="18" cy="18" r="9" stroke={color} strokeWidth="1.8" />
      <Path
        d="M9 27 Q13 9 18 18 Q23 27 27 9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  )
}
<template>
  <!-- Shared ink texture for <Stamp>: slight edge roughness plus sparse speckles. -->
  <svg class="ink-filter" width="0" height="0" aria-hidden="true" focusable="false">
    <filter
      id="carimbo-ink"
      x="-5%"
      y="-10%"
      width="110%"
      height="120%"
      color-interpolation-filters="sRGB"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.9"
        numOctaves="2"
        seed="4"
        result="noise"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale="1.6"
        xChannelSelector="R"
        yChannelSelector="G"
        result="rough"
      />
      <feColorMatrix
        in="noise"
        type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -7 5.2"
        result="speckles"
      />
      <feComposite in="rough" in2="speckles" operator="in" />
    </filter>
  </svg>
</template>

<style scoped>
.ink-filter {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}
</style>

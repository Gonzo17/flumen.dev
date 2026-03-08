<script setup lang="ts">
import { Analytics } from '@vercel/analytics/nuxt'
import { SpeedInsights } from '@vercel/speed-insights/nuxt'

const { locale } = useI18n()
const ogLocale = computed(() => locale.value === 'de' ? 'de_DE' : 'en_US')

useSeoMeta({
  title: 'Flumen',
  ogTitle: 'Flumen',
  description: 'Open-source GitHub dashboard for maintainers. Open source, streamlined.',
  ogDescription: 'Open-source GitHub dashboard for maintainers. Open source, streamlined.',
  ogImage: 'https://flumen.dev/og-image.png',
  ogUrl: 'https://flumen.dev',
  ogType: 'website',
  ogLocale,
  twitterCard: 'summary_large_image',
  twitterTitle: 'Flumen',
  twitterDescription: 'Open-source GitHub dashboard for maintainers. Open source, streamlined.',
  twitterImage: 'https://flumen.dev/og-image.png',
})
</script>

<template>
  <UApp>
    <Analytics />
    <SpeedInsights />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UserProfileDialog />
  </UApp>
</template>

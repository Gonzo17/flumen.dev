export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) {
    const redirect = useCookie('auth-redirect')
    redirect.value = to.fullPath
    const localePath = useLocalePath()
    return navigateTo(localePath('/'))
  }
})

export const validateEmail = (email: string) => {
  const emailPattern = /^[\w.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailPattern.test(email)
}
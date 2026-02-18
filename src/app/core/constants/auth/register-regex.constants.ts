export const REGISTER_REGEX = {
  name: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]{3,40}$/,
  phoneDialCode: /^\+\d{1,4}$/,
  phoneNational: /^\d{7,14}$/,
  companyName: /^(?=.{3,120}$).*\S.*$/,
  city: /^(?=.{2,80}$)[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]+$/,
  subdomain: /^(?=.{3,63}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
  website: /^(|https?:\/\/[^\s]+|[A-Za-z0-9.-]+\.[A-Za-z]{2,})$/,
  referralCode: /^(|[A-Za-z0-9_-]{3,40})$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/
} as const;

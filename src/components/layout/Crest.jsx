// A crest mark in the school's own language: navy shield, gold bearing.
// Deliberately an original geometric mark rather than a copy of the GEMS
// Modern Academy crest, so it sits beside the school identity without
// impersonating it. Swap in the real asset when the school provides one.

export default function Crest({ size = 30, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className}
      fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Shield */}
      <path d="M16 1.5 3.5 6v11.2c0 6.1 4.9 11.3 12.5 13.3 7.6-2 12.5-7.2 12.5-13.3V6L16 1.5Z"
        fill="#0a1e43" />
      {/* Gold chevron, echoing the school's gold band */}
      <path d="M16 8.5 24 13v3.4L16 12l-8 4.4V13l8-4.5Z" fill="#d9a441" />
      {/* Open book, for the academic half */}
      <path d="M9.5 19.2c2.3-.9 4.4-.9 6.5.3 2.1-1.2 4.2-1.2 6.5-.3v4.3c-2.3-.9-4.4-.9-6.5.3-2.1-1.2-4.2-1.2-6.5-.3v-4.3Z"
        fill="#ffffff" fillOpacity="0.92" />
    </svg>
  )
}

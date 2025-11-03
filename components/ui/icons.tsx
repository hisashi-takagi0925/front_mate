import * as React from 'react'

type IconProps = React.SVGProps<SVGSVGElement>

function base(props: IconProps) {
  const { className = 'h-4 w-4', ...rest } = props
  return { className, ...rest }
}

export const DashboardIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...base(props)}>
    <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />
  </svg>
)

export const InboxIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...base(props)}>
    <path d="M3 7l3-3h12l3 3v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M3 13h5l2 3h4l2-3h5" />
  </svg>
)

export const BookIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...base(props)}>
    <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" />
    <path d="M6 3v16" />
  </svg>
)

export const FileIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...base(props)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
)

export const BeakerIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...base(props)}>
    <path d="M10 2v6l-6 10a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L14 8V2" />
    <path d="M8 2h8" />
  </svg>
)


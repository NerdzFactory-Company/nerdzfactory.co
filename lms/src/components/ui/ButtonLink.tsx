import { Link, type LinkProps } from 'react-router-dom'
import { buttonClassName, type ButtonSize, type ButtonVariant } from '@/components/ui/buttonStyles'
import { cn } from '@/utils/helpers'

type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant
  size?: ButtonSize
  pill?: boolean
  fullWidth?: boolean
}

/** Router link styled as a button — avoids invalid <a><button> nesting. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  pill,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      {...rest}
      className={cn(buttonClassName({ variant, size, pill, fullWidth, className }), 'no-underline')}
    >
      {children}
    </Link>
  )
}

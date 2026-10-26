import type { AnchorHTMLAttributes } from "react";
import { navigate } from "./rpc";
export default function Link({ href, onClick, children, ...rest }:
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a {...rest} href={href.startsWith("/") ? "#" + href : href}
    onClick={(event) => {
      onClick?.(event);
      if (!event.defaultPrevented && href.startsWith("/") &&
          !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) {
        event.preventDefault();
        navigate(href);
      }
    }}>{children}</a>;
}

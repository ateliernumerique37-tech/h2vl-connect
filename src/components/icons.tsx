import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width="1em"
      height="1em"
      {...props}
    >
      <g fill="currentColor">
        <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88Z" />
        <path d="M172.43 172.43a88.23 88.23 0 0 1-88.86 0L128 128Z" />
        <path d="m172.43 83.57-44.43 44.43 44.43 44.43a88.23 88.23 0 0 0 0-88.86Z" />
      </g>
    </svg>
  );
}

import { useState, ReactNode } from "react";

interface Props {
  content: string;
  children: ReactNode;
}

export default function Tooltip({ content, children }: Props) {
  const [visible, setVisible] = useState(false);

  const toggle = () => setVisible(!visible);
  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  return (
    <div
      className="relative flex flex-col items-center group select-none"
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={toggle}
      onTouchStart={toggle}
    >
      {children}
      {visible && (
        <div className="absolute bottom-full mb-2 px-3 py-1 text-xs text-white bg-black bg-opacity-80 rounded shadow-lg z-50 whitespace-nowrap animate-fade-in">
          {content}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { FaRegCopy } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AiMsg({ text }) {
  const [isActive, setIsActive] = useState(false);
  const dropdownRef = useRef(null);
  let timeoutId;

  const resetTimeout = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => setIsActive(false), 3000);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setIsActive(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setIsActive(true);
    resetTimeout();
  };

  return (
    <li className="conversation__item me">
      <div className="conversation__item--content">
        <div className="conversation__item--wrapper">
          <div className="conversation__item--box">
            <div className="conversation__item--text">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
            <div
              ref={dropdownRef}
              className={`conversation__item--dropdown ${isActive ? "active" : ""}`}
            >
              <button
                type="button"
                className="conversation__item--dropdown-toggle"
                onClick={handleCopy}
                title="Copiază"
              >
                <FaRegCopy />
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

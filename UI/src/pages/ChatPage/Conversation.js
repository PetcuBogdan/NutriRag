import { useEffect, useRef } from "react";
import SendMsg from "./SendMsg";
import AiMsg from "./AiMsg";
import ClientMsg from "./ClientMsg";

function TypingIndicator() {
  return (
    <li className="conversation__item me">
      <div className="conversation__item--content">
        <div className="conversation__item--wrapper">
          <div className="conversation__item--box">
            <div className="conversation__item--text typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function Conversation({
  selectConversationId,
  messageList,
  setMessageList,
  token,
  ensureConversation,
}) {
  const bottomRef = useRef(null);
  const prevLastSenderRef = useRef(null);

  useEffect(() => {
    const last = messageList[messageList.length - 1];
    if (!last) return;

    const shouldScroll =
      last.sender_type === "typing" ||
      last.sender_type === "user" ||
      prevLastSenderRef.current === "typing";

    if (shouldScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    prevLastSenderRef.current = last.sender_type;
  }, [messageList]);

  return (
    <div className="conversation">
      <div className="conversation__main">
        <ul className="conversation__wrapper">
          {messageList.map((message, index) =>
            message.sender_type === "typing" ? (
              <TypingIndicator key={index} />
            ) : message.sender_type === "ai" ? (
              <AiMsg key={index} text={message.text} />
            ) : (
              <ClientMsg key={index} text={message.text} />
            )
          )}
          <li ref={bottomRef} style={{ height: 0 }} />
        </ul>
      </div>
      <SendMsg
        token={token}
        messageList={messageList}
        setMessageList={setMessageList}
        conversationId={selectConversationId}
        ensureConversation={ensureConversation}
      />
    </div>
  );
}

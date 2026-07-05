import { LuSendHorizonal } from "react-icons/lu";
import React, { useState } from "react";
import { apiFetch } from "../../utils/apiFetch";

const SUGGESTED_PROMPTS = [
  { icon: "🐟", label: "Somon la 100g", q: "Ce nutrienți conține somonul atlantic la 100g conform FooDB?" },
  { icon: "🥬", label: "Fier din spanac", q: "De ce fierul din spanac are biodisponibilitate scăzută față de carnea roșie?" },
  { icon: "🌿", label: "Vitamina D surse", q: "Care sunt cele mai bune surse alimentare de vitamina D și care este doza zilnică recomandată?" },
  { icon: "💊", label: "Folat vs acid folic", q: "Care este diferența dintre folatul natural din alimente și acidul folic sintetic din suplimente?" },
  { icon: "🌰", label: "Omega-3 vegetal", q: "Ce alimente vegetale conțin cei mai mulți acizi grași omega-3 și cât de eficientă este conversia ALA în EPA/DHA?" },
  { icon: "🥚", label: "Colină ouă", q: "Câtă colină conțin ouăle la 100g și de ce este colina esențială în sarcină?" },
];

export default function SendMsg({
  token,
  messageList,
  setMessageList,
  ensureConversation,
}) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text) => {
    const toSend = (text || message).trim();
    if (!toSend || isLoading) return;

    setMessage("");
    setIsLoading(true);
    setMessageList((prev) => [
      ...prev,
      { sender_type: "user", text: toSend },
      { sender_type: "typing" },
    ]);

    try {
      const response = await fetch("http://127.0.0.1:8001/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          message: toSend,
          history: messageList.map((m) => ({
            role: m.sender_type === "ai" ? "assistant" : "user",
            content: m.text,
          })),
        }),
      });

      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      const aiText = data.answer;

      setMessageList((prev) => [
        ...prev.filter((m) => m.sender_type !== "typing"),
        { sender_type: "ai", text: aiText },
      ]);

      const convId = await ensureConversation(toSend);
      await apiFetch(`http://localhost:8080/chat/${convId}`, {
        method: "POST",
        body: JSON.stringify({ text: toSend, sender_type: "user" }),
      });
      await apiFetch(`http://localhost:8080/chat/${convId}`, {
        method: "POST",
        body: JSON.stringify({ text: aiText, sender_type: "ai" }),
      });
    } catch (err) {
      setMessageList((prev) => [
        ...prev.filter((m) => m.sender_type !== "typing"),
        { sender_type: "ai", text: "⚠️ Eroare la conectarea cu NutriRAG. Verifică că serverul rulează și încearcă din nou." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const showSuggestions = messageList.filter((m) => m.sender_type === "user").length === 0;

  return (
    <div className="conversation__form-area">
      {showSuggestions && (
        <div className="suggested-prompts">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p.label}
              className="suggested-prompt-btn"
              onClick={() => sendMessage(p.q)}
              disabled={isLoading}
            >
              <span className="suggested-prompt-icon">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
      )}
      <div className="conversation__form">
        <div className="conversation__form--group">
          <textarea
            className="conversation__form--input"
            rows="1"
            placeholder="Întreabă NutriRAG despre nutriție, alimente sau analizele tale... (Enter pentru a trimite)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
        </div>
        <button
          type="button"
          className="conversation__form--button conversation__form--submit"
          onClick={() => sendMessage()}
          disabled={isLoading || !message.trim()}
        >
          <LuSendHorizonal />
        </button>
      </div>
    </div>
  );
}

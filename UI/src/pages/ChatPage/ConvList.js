import React from "react";
import ConvTitle from "./ConvTitle";
import { apiFetch } from "../../utils/apiFetch";

export default function ConvList({
  setMessagesList,
  data,
  selectConversation,
  setSelectConversation,
  setSelectedConversationId,
  token,
  onDelete,
  selectConversationId,
}) {
  const handleConvItemClick = (index, conversationId) => {
    console.log("Selected Conversation (before update):", selectConversation);
    setSelectConversation(index);
    setSelectedConversationId(conversationId);
    fetchMessages(conversationId);
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await apiFetch(
        `http://localhost:8080/chat/${conversationId}/messages`,
        { method: "GET" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      const initialMessage = {
        sender_type: "ai",
        text: "Bună! Sunt NutriRAG, asistentul tău inteligent de nutriție. Te pot ajuta cu întrebări despre alimente, nutrienți, biodisponibilitate sau poți să îmi trimiți analizele tale medicale pentru recomandări personalizate. Cu ce te pot ajuta?",
      };

      const updatedMessages = [initialMessage, ...data.messages];
      setMessagesList(updatedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  return (
    <div className="chat__message">
      <ul className="chat__message--list">
        {data.map((childData, index) => (
          <ConvTitle
            onDelete={onDelete}
            key={index}
            {...childData}
            isSelected={index === selectConversation}
            onClick={() => handleConvItemClick(index, childData._id)}
          />
        ))}
      </ul>
    </div>
  );
}

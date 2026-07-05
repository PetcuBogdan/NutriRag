import Sidenav from "../../components/Sidenav";
import ChatSidebar from "./ChatSidebar";
import Conversation from "./Conversation";
import React, { useState, useEffect } from "react";
import { apiFetch } from "../../utils/apiFetch";

export default function ChatPage() {
  const [selectConversation, setSelectedConversation] = useState();
  const [selectConversationId, setSelectedConversationId] = useState();
  const [messageList, setMessagesList] = useState([
    {
      sender_type: "ai",
      text: "Bună! Sunt NutriRAG, asistentul tău inteligent de nutriție. Te pot ajuta cu întrebări despre alimente, nutrienți, biodisponibilitate sau poți să îmi trimiți analizele tale medicale pentru recomandări personalizate. Cu ce te pot ajuta?",
    },
  ]);
  const [conversationsData, setConversationsData] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) fetchConversations();
  }, []); // eslint-disable-line

  const fetchConversations = async () => {
    try {
      const response = await apiFetch("http://localhost:8080/chat/conversations", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data);
        setConversationsData(data.conversations.conversations);
      } else {
        console.error("Error fetching conversations:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const handleDelete = (id) => {
    setConversationsData(conversationsData.filter((conv) => conv._id !== id));
  };

  const handleNewChat = async () => {
    try {
      const response = await apiFetch("http://localhost:8080/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ name: "New Chat" }),
      });

      if (response.ok) {
        const data = await response.json();
        setConversationsData([...conversationsData, data.conversation]);
      } else {
        console.error("Error creating conversation:", response.statusText);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const ensureConversation = async (firstMessage) => {
    if (selectConversationId) return selectConversationId;
    const response = await apiFetch("http://localhost:8080/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ name: firstMessage.slice(0, 40) }),
    });
    if (!response.ok) throw new Error("Failed to create conversation");
    const data = await response.json();
    const newConv = data.conversation;
    setConversationsData((prev) => [...prev, newConv]);
    setSelectedConversationId(newConv._id);
    return newConv._id;
  };

  return (
    <section className="chat-page">
      <div className="structure">
        <Sidenav passedValue="chat" />
        <div className="chat">
          <ChatSidebar
            setMessagesList={setMessagesList}
            token={token}
            data={conversationsData}
            selectConversation={selectConversation}
            setSelectConversation={setSelectedConversation}
            selectConversationId={selectConversationId}
            setSelectedConversationId={setSelectedConversationId}
            onCreateNewChat={handleNewChat}
            onDelete={handleDelete}
          />
          <Conversation
            selectConversationId={selectConversationId}
            messageList={messageList}
            setMessageList={setMessagesList}
            token={token}
            ensureConversation={ensureConversation}
          />
        </div>
      </div>
    </section>
  );
}

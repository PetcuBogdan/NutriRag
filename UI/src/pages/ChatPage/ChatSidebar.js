import { IconContext } from "react-icons";
import { FaPlus } from "react-icons/fa";
import { FaSearch } from "react-icons/fa";
import ConvList from "./ConvList";

export default function ChatSidebar({
  setMessagesList,
  token,
  data,
  selectConversation,
  setSelectConversation,
  selectConversationId,
  setSelectedConversationId,
  onCreateNewChat,
  onDelete,
}) {
  const handleNewChatClick = () => {
    onCreateNewChat();
  };

  return (
    <div className="chat__sidebar">
      <div className="chat__sidebar--new">
        <button className="chat__sidebar--new-btn" onClick={handleNewChatClick}>
          Create new chat{" "}
          <IconContext.Provider value={{ className: "react-icon" }}>
            <FaPlus />
          </IconContext.Provider>
        </button>
      </div>
      <form action="" className="chat__sidebar--form">
        <input
          type="text"
          className="chat__sidebar--form--input"
          placeholder="Search..."
        />

        <IconContext.Provider
          value={{ className: "chat__sidebar--form-submit" }}
        >
          <FaSearch />
        </IconContext.Provider>
      </form>
      <ConvList
        onDelete={onDelete}
        selectConversationId={selectConversationId}
        setMessagesList={setMessagesList}
        token={token}
        data={data}
        selectConversation={selectConversation}
        setSelectConversation={setSelectConversation}
        setSelectedConversationId={setSelectedConversationId}
      />
    </div>
  );
}

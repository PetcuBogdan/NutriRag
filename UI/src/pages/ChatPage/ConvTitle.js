/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect } from "react";
import { SlOptionsVertical } from "react-icons/sl";
import { FaPencil } from "react-icons/fa6";
import { MdDeleteOutline } from "react-icons/md";
import { IconContext } from "react-icons";
import { IoChatboxEllipsesOutline } from "react-icons/io5";
import Modal from "./Rename";
import { apiFetch } from "../../utils/apiFetch";

export default function ConvTitle({
  _id,
  name,
  isSelected,
  onClick,
  onDelete,
}) {
  const [isActive, setIsActive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState(name);

  const toggleDropdown = (event) => {
    event.stopPropagation();
    setIsActive(!isActive);
  };

  const handleDelete = async (event) => {
    event.stopPropagation();
    try {
      const response = await apiFetch(
        `http://localhost:8080/chat/conversation/${_id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        onDelete(_id);
      } else {
        console.error("Failed to delete conversation");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleRename = async () => {
    try {
      const response = await apiFetch(
        `http://localhost:8080/chat/conversation/${_id}`,
        { method: "PUT", body: JSON.stringify({ name: newName }) }
      );

      if (response.ok) {
        setIsModalOpen(false);
        // Optionally refresh the conversation list or update the state to reflect the new name
      } else {
        console.error("Failed to rename conversation");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    const handleGlobalClick = (event) => {
      // Check if the click was outside the element
      if (!event.target.closest(".chat__message--item")) {
        setIsActive(false);
      }
    };

    document.addEventListener("mousedown", handleGlobalClick);

    return () => {
      document.removeEventListener("mousedown", handleGlobalClick);
    };
  }, []);

  return (
    <li
      className={`chat__message--item ${
        isSelected ? "chat__message--selected" : ""
      }`}
      onClick={onClick}
    >
      <button className="chat__message--areplace">
        <span className="chat__message--info">
          <span className="chat__message--name">
            <IconContext.Provider value={{ className: "chat__message--icon" }}>
              <IoChatboxEllipsesOutline />
            </IconContext.Provider>
            {name}
          </span>
        </span>

        <div className="chat__message--list--dropdown" style={{ position: 'relative' }}>
          <span
            className={`${
              isSelected
                ? "chat__message--selected-toggle"
                : "chat__message--list--dropdown-toggle"
            }`}
            onClick={toggleDropdown}
          >
            <SlOptionsVertical />
          </span>
          <ul
            className={`chat__message--list--dropdown-list ${
              isActive && !isModalOpen ? "active" : ""
            }`}
          >
            <li>
              <a
                href="#"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsModalOpen(true);
                  setIsActive(false); // Close the dropdown when modal is open
                }}
              >
                <FaPencil />
                Rename
              </a>
            </li>
            <li>
              <a href="#" onClick={handleDelete}>
                <MdDeleteOutline />
                Delete
              </a>
            </li>
          </ul>
        </div>
      </button>
      <Modal
        show={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleRename}
        name={newName}
        setName={setNewName}
      />
    </li>
  );
}

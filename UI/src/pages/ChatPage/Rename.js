import React from "react";
import styled from "styled-components";

const ModalBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 13000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 20px;
  border-radius: 5px;
  width: 400px;
  max-width: 80%;
  z-index: 1001;
`;

const Modal = ({ show, onClose, onSave, name, setName }) => {
  if (!show) return null;

  return (
    <ModalBackdrop>
      <ModalContent>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New conversation name"
        />
        <div style={{ marginTop: "20px" }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={onSave} style={{ marginLeft: "10px" }}>
            Save
          </button>
        </div>
      </ModalContent>
    </ModalBackdrop>
  );
};

export default Modal;

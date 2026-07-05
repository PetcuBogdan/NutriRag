import React, { useState } from "react";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { FiLogOut } from "react-icons/fi";
import { MdOutlineRestaurantMenu } from "react-icons/md";
import { RiTestTubeLine } from "react-icons/ri";

export default function Sidenav(props) {
  const [activeItem] = useState(props.passedValue);

  return (
    <aside className="sidenav">
      <a href="/chat">
        <span className="sidenav__logo-text" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3a7bd5', padding: '12px 0', display: 'block', textAlign: 'center' }}>
          N
        </span>
      </a>
      <ul className="sidenav__menu">
        <li className={activeItem === "chat" ? "active" : ""}>
          <a href="/chat" data-title="Chat Nutriție">
            <IoChatbubbleEllipsesOutline />
          </a>
        </li>
        <li className={activeItem === "analysis" ? "active" : ""}>
          <a href="/analysis" data-title="Analize Medicale">
            <RiTestTubeLine />
          </a>
        </li>
        <li className={activeItem === "menu" ? "active" : ""}>
          <a href="/menu" data-title="Meniu Personalizat">
            <MdOutlineRestaurantMenu />
          </a>
        </li>
        <li>
          <a href="/" data-title="Ieșire" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('role'); }}>
            <FiLogOut />
          </a>
        </li>
      </ul>
    </aside>
  );
}

import { SetStateAction } from "react";
import User from "../../../shared/users/user"
import { socket } from "../App";
import "./Connected-users.css"

type UserListProps = {
    userList: User[];
    myUser: User;
    disconnectedUserList: User[];
    fakeConversationName: React.Dispatch<SetStateAction<string>>;
  };

function Connected_users({ userList, myUser, disconnectedUserList, fakeConversationName }: UserListProps){

    function reloadUsers() {
        socket.emit("-get_users", "");
    }

    function setConversationName(event: React.MouseEvent<HTMLButtonElement>){
      const strongElement = event.currentTarget.querySelector("strong");
      if (strongElement) {
        console.log("ID del strong:", strongElement.id);
        const text = strongElement.textContent;
        const myUserName = myUser.getName();
        const myUserId = myUser.getUserId();
        if(text){
          const names: string[] = [text, myUserName];
          socket.emit("set-conversation", `_${myUserId}_${strongElement.id}_`, names);
        }

        if(strongElement.textContent)
        fakeConversationName(strongElement.textContent);

      }
    }

      return(
      <>
        <div id="header-connected-users">
            <h2 id="title-header">Connnected users:</h2>
            <button id="button-header" onClick={reloadUsers}>&#x21bb;</button>
        </div>
        <div id="users-container">
          {userList.map((user, index)=>{
              return <button onClick={setConversationName} key={index} className="button-connected-user"><strong id={`${user.getUserId()}`}>{user.getName()}</strong></button>
          })}
          {disconnectedUserList.map((user, index)=>{
              return <button onClick={setConversationName} key={index} className="button-disconnected-user"><strong id={`${user.getUserId()}`}>{user.getName()}</strong></button>
          })}
        </div>
      </>);
}

export default Connected_users;
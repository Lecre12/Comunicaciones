import { SetStateAction } from "react";
import User from "../../../shared/users/user"
import { socket } from "../App";
import "./Connected-users.css"

type UserListProps = {
    userList: User[];
    myUser: User;
  };

function Connected_users({ userList, myUser }: UserListProps){

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
      }
    }

      return(
      <>
        <div id="header-connected-users">
            <h2 id="title-header">Connnected users:</h2>
            <button id="button-header" onClick={reloadUsers}>Reload</button>
        </div>
        
        {userList.map((user, index)=>{
            return <button onClick={setConversationName} key={index}><strong id={`${user.getUserId()}`}>{user.getName()}</strong></button>
        })}
      </>);
}

export default Connected_users;
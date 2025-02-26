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

    function sendImage(file: File){
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);

      reader.onload = () => {
        const buffer = new Uint8Array(reader.result as ArrayBuffer);
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          buffer: buffer,
        };

        socket.emit("upload_image", myUser.getUserId(), fileData);
        console.log("Archivo enviado:", file.name);
      };
    }

    function editMyUser(){
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/svg+xml, image/png, image/webp, image/jpeg";
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          if (file.size > 50e3) {
            alert("El archivo no debe superar los 50KB.");
            return;
          }
          sendImage(file);
          console.log("Archivo seleccionado:", file.name);
        }
      };

      input.click();
    }

      return(
      <>
        <div id="header-connected-users">
            <h2 id="title-header">Connnected users:</h2>
            <button id="button-header" onClick={reloadUsers}>&#x21bb;</button>
        </div>
        <div id="users-container">
          {userList.map((user, index)=>{
            console.log("Se esta iterando:");
            console.log(user);
            if(user.getUserId() == myUser.getUserId() && !user.getIcon()?.includes("undefined")){
              return (
                <div id="container-myuser" key={index}>
                  <button onClick={setConversationName} className="button-connected-user" id="myuser-button">
                  <img src={user.getIcon()} className="img-user"/>
                  <strong id={`${user.getUserId()}`}>{user.getName()}</strong>
                  </button>
                  <button id="config-myuser-button" onClick={editMyUser}>
                    ⚙
                  </button>
                </div>
                );
            }else if(user.getUserId() == myUser.getUserId()){
              return (
                <div id="container-myuser" key={index}>
                  <button onClick={setConversationName} className="button-connected-user" id="myuser-button">
                  <strong id={`${user.getUserId()}`}>{user.getName()}</strong>
                  </button>
                  <button id="config-myuser-button" onClick={editMyUser}>
                    ⚙
                  </button>
                </div>
                );
            }

            if(!user.getIcon()?.includes("undefined")){
              return <button onClick={setConversationName} key={index} className="button-connected-user"><img src={user.getIcon()} className="img-user"/><strong id={`${user.getUserId()}`}>{user.getName()}</strong></button>
            }
            return <button onClick={setConversationName} key={index} className="button-connected-user"><strong id={`${user.getUserId()}`}>{user.getName()}</strong></button>
          })}
          {disconnectedUserList.map((user, index)=>{
            if(!user.getIcon()?.includes("undefined")){
              return <button onClick={setConversationName} key={index} className="button-disconnected-user"><img src={user.getIcon()} className="img-user"/><strong id={`${user.getUserId()}`}>{user.getName()}</strong></button>
            }
            return <button onClick={setConversationName} key={index} className="button-disconnected-user"><strong id={`${user.getUserId()}`}>{user.getName()}</strong></button>
          })}
        </div>
      </>);
}

export default Connected_users;
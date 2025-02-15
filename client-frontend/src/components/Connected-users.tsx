import User from "../../../shared/users/user"
import { socket } from "../App";
import "./Connected-users.css"

type UserListProps = {
    userList: User[];
  };

function Connected_users({ userList }: UserListProps){

    function reloadUsers() {
        socket.emit("message", "-get connected_users".trim());
    }
      return(
      <>
        <div id="header-connected-users">
            <h2 id="title-header">Connnected users:</h2>
            <button id="button-header" onClick={reloadUsers}>Reload</button>
        </div>
        
        {userList.map((user, index)=>{
            return <a><strong key={index}>{user.getName()}</strong></a>
        })}
      </>);
}

export default Connected_users;
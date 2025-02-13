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
        <div>
            <h2>Connnected users:</h2>
            <button onClick={reloadUsers}>Reload</button>
        </div>
        
        {userList.map((user, index)=>{
            return <a><strong key={index}>{user.getName()}</strong></a>
        })}
      </>);
}

export default Connected_users;
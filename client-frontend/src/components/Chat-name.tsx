type Props = {
    title?: string;
};

function Chat_name({ title }: Props){

    if(!title){
       title = "♦ Chat App ♦" 
    }  else{
        title = `${title}`;
    }

    return(
    <>
        <h1>{title}</h1>
    </>);
    
}

export default Chat_name;
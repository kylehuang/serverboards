import React from 'react'

function Permissions(props){
  return (
    <div className="ui text container">
      <h1>No permissions yet for {props.service.name}</h1>
    </div>
  )
}

export default Permissions

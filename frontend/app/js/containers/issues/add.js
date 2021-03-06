import React from 'react'
import rpc from 'app/rpc'
import {goto} from 'app/utils/store'
import AddView from 'app/components/issues/add'
import {parse_comment, update_issue_multi} from './utils'
import {map_get} from 'app/utils'
import store from 'app/utils/store'
import Flash from 'app/flash'

class Add extends React.Component{
  handleAdd(title, description){
    let updates = parse_comment(description)
    if (updates.length==0 || updates[0].type!="comment"){
      Flash.error("Need some comment.")
      return
    }
    description=updates[0].data
    updates=updates.slice(1)

    let data = {title, description}

    let project=map_get(store.getState(), ["project","current"])
    if (project){
      data.aliases=[`project/${project}`]
    }

    rpc.call("issues.create", data)
      .then( (id) => {
        if (updates.length>0)
          return update_issue_multi(id, updates).then( () => id )
        return id
      }).then( (id) => goto(`/issues/${id}`) )
  }
  render(){
    return (
      <AddView {...this.props} onAdd={this.handleAdd.bind(this)}/>
    )
  }
}

export default Add;

import React from 'react'
import Modal from '../modal'
import GenericForm from '../genericform'
import rpc from 'app/rpc'
import {i18n} from 'app/utils/i18n'
import PropTypes from 'prop-types'
import store from 'app/utils/store'

class ActionModal extends React.Component{
  constructor(props){
    super(props)
    this.state =  {}
  }
  triggerAction(){
    console.log(this.state)
    const action_id=this.props.action.id
    const params=$.extend({}, this.props.params, this.state)
    console.log(params)
    rpc.call("action.trigger",
      [action_id, params]).then((uuid) => {
        store.goto(`/process/${uuid}`)
      })
  }
  setMissingParams(params){
    this.setState(params)
  }
  render(){
    const props=this.props
    console.log(props)

    return (
      <Modal>
        <div className="ui content with padding and scroll">
          <h2 className="ui header">{i18n(props.action.name)}</h2>
          <div className="ui meta">{i18n(props.action.description)}</div>
          <GenericForm fields={props.missing_params} updateForm={this.setMissingParams.bind(this)}/>
          <div className="actions">
            <button className="ui yellow button" onClick={this.triggerAction.bind(this)}>{i18n("Trigger action")}</button>
          </div>
        </div>
      </Modal>
    )
  }
}

ActionModal.contextTypes = {
  router: PropTypes.object
}

export default ActionModal

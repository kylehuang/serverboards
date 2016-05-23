import UsersView from '../../components/settings/users'
import event from '../../utils/event'
import { user_list, user_add, user_update } from '../../actions/auth'

var Users = event.subscribe_connect(
  (state) => ({
    users: state.auth.users,
    location: state.routing.locationBeforeTransitions,
  }),
  (dispatch) => ({
    loadUserList: () => dispatch( user_list() ),
    onAddUser:(user) => dispatch( user_add(user) ),
    onUpdateUser:(email, attributes) => dispatch( user_update(email, attributes) ),
  }),
  ["user.updated", "user.added"],
  [user_list]
)(UsersView)

export default Users

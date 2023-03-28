const core = require('@actions/core')

try {
    // `who-to-call` input defined in action metadata file
    const whoToCall = core.getInput('who-to-call', { required: true })
    console.log("Calling " + whoToCall);

    const token = core.getInput('token')
    console.log("Token: " + token)



    // TODO: wait for the workflow to end and recover the output
} catch (error) {
    core.setFailed(error.message);

}
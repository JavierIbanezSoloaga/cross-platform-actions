import { Octokit } from 'octokit';
const core = require('@actions/core')

try {
    // `who-to-call` input defined in action metadata file
    const whoToCall = core.getInput('who-to-call', { required: true })
    console.log("Calling " + whoToCall);

    const token = core.getInput('token')
    console.log("Token: " + token)

    const octokit = new Octokit({
        auth: token
    })
    
    const id = 1234
    await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
        owner: 'JavierIbanezSoloaga',
        repo: whoToCall,
        workflow_id: 'printID.yml',
        inputs: {
            id: id
        },
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })



    // TODO: wait for the workflow to end and recover the output
} catch (error) {
    core.setFailed(error.message);

}
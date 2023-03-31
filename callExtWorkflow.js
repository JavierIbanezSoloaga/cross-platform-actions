import { Octokit } from 'octokit';
import * as core from '@actions/core'

try {
    // `who-to-call` input defined in action metadata file
    const whoToCall = core.getInput('who-to-call', { required: true })
    console.log("Calling " + whoToCall);

    const token = core.getInput('token')
    //console.log("Token: " + token)

    const run_date_filter = new Date().toJSON().slice(0, 16)
    console.log(run_date_filter)

    const octokit = new Octokit({
        auth: token
    })

    const id = '1234'
    await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
        owner: 'JavierIbanezSoloaga',
        repo: whoToCall,
        workflow_id: 'printID.yml',
        ref: 'main',
        inputs: {
            id: id
        },
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })

    let workflowID = ""

    // while (workflowID === "") {
        let response = await octokit.request('GET /repos/{owner}/{repo}/actions/runs?created={run_date_filter}', {
            owner: 'JavierIbanezSoloaga',
            repo: whoToCall,
            run_date_filter: run_date_filter,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }

        })

        console.log(response.data.total_count)

        if(response.data.total_count > 0){
            for(let run of response.data.workflow_runs){
                let jobs = await octokit.request('GET {jobs_url}', {
                    jobs_url: run['jobs_url']
                })
                
                console.log(jobs)
            }
        }
    // }

    // TODO: wait for the workflow to end and recover the output
} catch (error) {
    core.setFailed(error.message);

}
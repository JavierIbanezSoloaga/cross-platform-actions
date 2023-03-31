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
    let jobFound = false
    while (!jobFound) {
        let response = await octokit.request('GET /repos/{owner}/{repo}/actions/runs?created={run_date_filter}', {
            owner: 'JavierIbanezSoloaga',
            repo: whoToCall,
            run_date_filter: run_date_filter,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }

        })
        console.log("here is a try")
        let runs = response.data.workflow_runs.filter(r => r.name !== "Run Deploy Action")
        if (runs.length > 0) {
            console.log("hay runs")
            console.log(runs)
            let targetJob = null
            while (targetJob === null) {
                for (let run of runs) {
                    let jobs = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{id}/jobs', {
                        owner: 'JavierIbanezSoloaga',
                        repo: whoToCall,
                        id: run['id']
                    })
                    if (jobs.data.jobs.every(job => job.status === "completed")) {
                        console.log("Estan completos")
                        targetJob = jobs.data.jobs.find(job => job.steps.find(step => step.name === id))
                        console.log(jobs.data.jobs)
                    }else{
                        await new Promise(r => setTimeout(r, 3000));
                    }
                }
            }
            jobFound = !(targetJob === undefined)
        }
        if(!jobFound){
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    // TODO: wait for the workflow to end and recover the output
} catch (error) {
    core.setFailed(error.message);

}
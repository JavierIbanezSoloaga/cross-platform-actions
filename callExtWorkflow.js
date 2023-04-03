import { Octokit } from 'octokit';
import * as core from '@actions/core'

function sleep(time) {
    return new Promise(r => setTimeout(r, time));
}

try {
    // `who-to-call` input defined in action metadata file
    const whoToCall = core.getInput('who-to-call', { required: true })
    console.log("Calling " + whoToCall);

    const token = core.getInput('token')

    const run_date_filter = new Date().toJSON().slice(0, 16)
    console.log(run_date_filter)

    const octokit = new Octokit({
        auth: token
    })
    // TODO: Generate a random ID
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

    const sleepTime = 3000
    let targetJob = null
    while (targetJob === undefined || targetJob === null) {
        let response = await octokit.request('GET /repos/{owner}/{repo}/actions/runs?created={run_date_filter}', {
            owner: 'JavierIbanezSoloaga',
            repo: whoToCall,
            run_date_filter: run_date_filter,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }

        })
        console.log("here is a try")
        let runs = response.data.workflow_runs.filter(run => run.status === "completed")
        if (runs.length > 0) {
            console.log("hay runs")

            for (let run of runs) {
                let jobs = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{id}/jobs', {
                    owner: 'JavierIbanezSoloaga',
                    repo: whoToCall,
                    id: run['id']
                })
                console.log(jobs.data.jobs)
                targetJob = jobs.data.jobs.find(job => job.steps.find(step => step.name === id))
                // If the target job is found go outside the loop 
                if (targetJob !== undefined) break
            }

            console.log(targetJob)
        }
        if (targetJob === undefined || targetJob === null) {
            await sleep(sleepTime)
        }
    }

    // TODO: wait for the workflow to end and recover the output
} catch (error) {
    core.setFailed(error.message);

}
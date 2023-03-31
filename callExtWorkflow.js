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

    const sleepTime = 3000
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

            let targetJob = null
            let completedRuns = runs.filter(run => run.status === "completed")

            while (targetJob === null && completedRuns.length > 0) {
                for (let run of completedRuns) {
                    let jobs = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{id}/jobs', {
                        owner: 'JavierIbanezSoloaga',
                        repo: whoToCall,
                        id: run['id']
                    })
                    if (jobs.data.jobs.every(job => job.status === "completed")) {
                        console.log("Estan completos")
                        console.log(jobs.data.jobs)
                        targetJob = jobs.data.jobs.find(job => job.steps.find(step => step.name === id))
                        if (targetJob !== undefined) break
                    } else {
                        await sleep(sleepTime)
                    }
                }
            }

            console.log(targetJob)
            jobFound = !(targetJob === undefined | targetJob === null)
        }
        if (!jobFound) {
            await sleep(sleepTime)
        }
    }

    // TODO: wait for the workflow to end and recover the output
} catch (error) {
    core.setFailed(error.message);

}
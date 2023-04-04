import { Octokit } from 'octokit';
import * as core from '@actions/core'

function sleep(time) {
    return new Promise(r => setTimeout(r, time));
}

try {
    const SLEEP_DELAY = 3000
    const workflow_id = 'printID.yml'
    const owner = 'JavierIbanezSoloaga'
    let targetJob = null
    // TODO: Generate a random ID
    const id = '1234'

    // `who-to-call` input defined in action metadata file
    const whoToCall = core.getInput('who-to-call', { required: true })
    console.log("Calling " + whoToCall);

    const token = core.getInput('token')

    // Format YYYY-MM-DDTHH:MM
    const run_date_filter = new Date().toJSON().slice(0, 16)

    const octokit = new Octokit({
        auth: token
    })
    
    await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
        owner: owner,
        repo: whoToCall,
        workflow_id: workflow_id,
        ref: 'main',
        inputs: {
            id: id
        },
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })

    while (targetJob === undefined || targetJob === null) {
        let response = await octokit.request('GET /repos/{owner}/{repo}/actions/runs?created={run_date_filter}', {
            owner: owner,
            repo: whoToCall,
            run_date_filter: run_date_filter,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }

        })
        let runs = response.data.workflow_runs.filter(run => run.status === "completed")
        if (runs.length > 0) {

            for (let run of runs) {
                let jobs = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{id}/jobs', {
                    owner: owner,
                    repo: whoToCall,
                    id: run['id']
                })
                targetJob = jobs.data.jobs.find(job => job.steps.find(step => step.name === id))
                // If the target job is found go outside the loop 
                if (targetJob !== undefined) break
            }
        }
        if (targetJob === undefined || targetJob === null) {
            await sleep(SLEEP_DELAY)
        }
    }
    console.log(targetJob)

    let artifacts = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts', {
        owner: owner,
        repo: whoToCall,
        run_id: targetJob['run_id']
    })

    let targetArtifact = artifacts.data.artifacts.find(artifact => artifact.name === "example-artifact")
    let artifactFiles = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/zip', {
        owner: owner,
        repo: whoToCall,
        artifact_id: targetArtifact['id']
    })
    console.log(artifactFiles)

    core.setOutput("artifact", artifactFiles.data)

    // TODO: wait for the workflow to end and recover the output
} catch (error) {
    core.setFailed(error.message);

}
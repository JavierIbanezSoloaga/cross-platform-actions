import { Octokit } from 'octokit';
import * as core from '@actions/core'
import JSZip from 'jszip';

function sleep(time) {
    return new Promise(r => setTimeout(r, time));
}
function getJsonFromZip(zipFiles) {
    const zip = new JSZip();
    const jsonArtifact = [];
    return zip.loadAsync(zipFiles)
        .then(zip => {
            return Object.values(zip.files)[0].async('string');
            // Object.values(zip.files).forEach(file => {
            //     jsonArtifact.push(file.async('string'));
            // })
            // return Promise.all(jsonArtifact);
        })
        .catch(error => {
            core.setFailed(error.message)
        });
}

try {
    const SLEEP_DELAY = 3000
    let workflow_id = 'printID.yml'
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
    console.log(run_date_filter)

    const octokit = new Octokit({
        auth: token
    })
    core.info("Dispatching workflow " + workflow_id + " of " + whoToCall)
    core.debug("Dispatching workflow with this options " + JSON.stringify({
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
    }, null, 2))

    let workflows = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
        owner: owner,
        repo: whoToCall,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })

    console.log(workflows.data.workflows)

    workflow_id = workflows.data.workflows.find(workflow => workflow.name === 'ID Example')['id']

    console.log('workflow_id: ', workflow_id) 
    
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
    core.warning("Start asking for the job");
    while (targetJob === undefined || targetJob === null) {
        let response = await octokit.request('GET /repos/{owner}/{repo}/actions/runs?created>={run_date_filter}', {
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
            console.log('targetJob: ', targetJob)
        }
        if (targetJob === undefined || targetJob === null) {
            await sleep(SLEEP_DELAY)
            core.warning("Waiting for the job to finish");
        }
    }

    if (targetJob.conclusion !== "success") {
        core.setFailed(`Job ${targetJob.name} failed`);
    } else {
        let targetArtifact = undefined
        while (targetArtifact === undefined) {
            let artifacts = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts', {
                owner: owner,
                repo: whoToCall,
                run_id: targetJob['run_id']
            })
            console.log('artifacts: ', artifacts)

            targetArtifact = artifacts.data.artifacts.find(artifact => artifact.name === "example-artifact")

            console.log('targetArtifact: ', targetArtifact)
            if (targetArtifact !== undefined) {
                let artifactFiles = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/zip', {
                    owner: owner,
                    repo: whoToCall,
                    artifact_id: targetArtifact['id']
                })
                console.log('artifactFiles: ', artifactFiles);
                getJsonFromZip(artifactFiles.data)
                    .then(output => {
                        console.log('outside: ' + output);
                        core.setOutput("deploy-artifact", output);
                    });
            }
            if (targetArtifact === undefined) {
                await sleep(SLEEP_DELAY)
            }
        }
    }
} catch (error) {
    core.setFailed(error.message);

}
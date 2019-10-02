import * as core from '@actions/core'
import * as github from '@actions/github'

type PRInfo = {
  branch: string
  prNumber: string
}

async function run() {
  try {
    const token = core.getInput('GITHUB_TOKEN', { required: true })

    const prInfo = getPRInfo()
    if (!prInfo) {
      console.log('Could not get the branch name from context, exiting')
      return
    }

    const { branch, prNumber } = prInfo
    const issueNumber = branch.split('-').pop()

    if (!issueNumber || !parseInt(issueNumber)) {
      console.log('Could not get the issueNumber, exiting')
      return
    }

    const text = `This PR closes: #${issueNumber}`

    const client = new github.GitHub(token)
    await createComment(client, prNumber, text)
  } catch (error) {
    core.error(error)
    core.setFailed(error.message)
  }
}

function getPRInfo(): PRInfo | undefined {
  const pr = github.context.payload.pull_request
  if (!pr) {
    return
  }

  return {
    branch: pr.head.ref,
    prNumber: pr.node_id,
  }
}

async function createComment(
  client: github.GitHub,
  prNodeId: string,
  body: string
): Promise<void> {
  await client.graphql(
    `mutation AddComment($input: AddCommentInput!) {
      addComment(input:$input) {
        clientMutationId
      }
    }
    `,
    {
      input: {
        subjectId: prNodeId,
        body,
      },
    }
  )
}

run()

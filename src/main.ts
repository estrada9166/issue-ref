import * as core from '@actions/core'
import * as github from '@actions/github'
import * as octokit from '@octokit/rest'

type PRInfo = {
  branch: string
  prNumber: string
  commits: octokit.PullsListCommitsResponse
}

const ISSUES_START_TAG = '<issues>'
const ISSUES_END_TAG = '</issues>'

async function run() {
  try {
    const token = core.getInput('GITHUB_TOKEN', { required: true })
    const modifyDescription = core.getInput('MODIFY_DESCRIPTION', {
      required: false,
    })

    const prInfo = await getPRInfo()
    if (!prInfo) {
      console.log('Could not get the branch name from context, exiting')
      return
    }

    // first we look at the branch name...
    const { branch, prNumber, commits } = prInfo
    const issueNumbers: number[] = []
    const branchIssueNumber = extractIssueNumber(branch)
    if (branchIssueNumber) {
      issueNumbers.push(branchIssueNumber)
    }

    // then we look at the commits...
    if (commits) {
      for (const commitRelation of commits) {
        const message = commitRelation.commit.message
        const commitIssueNumber = extractIssueNumber(message)
        if (commitIssueNumber) {
          issueNumbers.push(commitIssueNumber)
        }
      }
    }

    if (issueNumbers.length === 0) {
      console.log(
        `Could not get the issueNumber from branch name ${branch} or related commits, exiting`
      )
      return
    }

    const uniqueIssueNumbers = Array.from(new Set(issueNumbers))

    const text = `This PR closes #${uniqueIssueNumbers.join(', closes #')}.`

    const client = new github.GitHub(token)

    if (modifyDescription) {
      let body = github.context.payload.pull_request!.body || ''
      body = body.replace(
        new RegExp(
          `\\n\\n${ISSUES_START_TAG}[\\w\\W\\s\\S]*${ISSUES_END_TAG}`,
          'g'
        ),
        ''
      )

      body += '\n\n' + ISSUES_START_TAG + text + ISSUES_END_TAG

      await client.pulls.update({
        repo: github.context.payload.repository!.name,
        owner: github.context.payload.repository!.owner.login,
        pull_number: github.context.payload.pull_request!.number,
        body: body,
      })
    } else {
      await createComment(client, prNumber, text)
    }
  } catch (error) {
    core.error(error)
    core.setFailed(error.message)
  }
}

function extractIssueNumber(str: string): number | undefined {
  for (const part of str.split(/[-:_\W#\/]+/g)) {
    const maybeIssueNumber = parseInt(part)
    if (maybeIssueNumber) {
      return maybeIssueNumber
    }
  }
}

async function getPRInfo(): Promise<PRInfo | undefined> {
  const payload = github.context.payload
  console.log(JSON.stringify(github.context.payload, undefined, 2))

  const pr = payload.pull_request
  if (!pr) {
    return
  }

  const token = core.getInput('GITHUB_TOKEN', { required: true })
  const client = new github.GitHub(token)
  const commits = await client.pulls.listCommits({
    pull_number: pr.number,
    owner: pr.base.repo.owner.login,
    repo: pr.base.repo.name,
    per_page: 100,
  })

  return {
    branch: pr.head.ref,
    prNumber: pr.node_id,
    commits: commits.data,
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

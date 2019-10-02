"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput('GITHUB_TOKEN', { required: true });
            const prInfo = getPRInfo();
            if (!prInfo) {
                console.log('Could not get the branch name from context, exiting');
                return;
            }
            const { branch, prNumber } = prInfo;
            const issueNumber = branch.split('-').pop();
            const text = `This PR close: #${issueNumber}`;
            const client = new github.GitHub(token);
            yield createComment(client, prNumber, text);
        }
        catch (error) {
            core.error(error);
            core.setFailed(error.message);
        }
    });
}
function getPRInfo() {
    console.log('-----1>', JSON.stringify(github.context.payload));
    const pr = github.context.payload;
    if (!pr) {
        return;
    }
    return {
        branch: pr.head.ref,
        prNumber: pr.node_id,
    };
}
function createComment(client, prNodeId, body) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.graphql(`mutation AddComment($input: AddCommentInput!) {
      addComment(input:$input) {
        clientMutationId
      }
    }
    `, {
            input: {
                subjectId: prNodeId,
                body,
            },
        });
    });
}
run();

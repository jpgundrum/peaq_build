import { expect } from "chai";
import { readDID, createDID, createRole, fetchRole } from "../src/peaq_sdk.js";

const name = "myDID";
const roleName = "myRole";
const ownerAddress = "5GsA2xjSBY6DhpTGKKdJ4BjUYpbBaP5wxZnvBoHSytURn6N2";
const roleId = "78709009-cf06-4224-8632-b5ee8512";

describe("peaq SDK tests", function() {
    describe("DID modules", function() {
        it("Create did returns the mocked did string correctly", async function() {
            const result = await createDID(mockSdk, name);

            expect(result).to.equal("0x5b033dde6df25da057ee3a59c69af6cc56bf4612b7890afb4af5f6d447481e47");
        });

        it("Read returns the mocked read sdk correctly", async function() {
            const result = await readDID(mockSdk, name);

            expect(result.name).to.equal("test-did-14");
            expect(result.value).to.equal("0x0a3964...316433");
            expect(result.created).to.equal("1,682,100,174,024");
            expect(result.document.id).to.equal("did:peaq:5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
            expect(result.document.controller).to.equal("did:peaq:5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
            expect(result.document.verificationmethodsList[0].id).to.equal("dc4702d6-71e7-4571-adb4-a7cd4945e1d3");
            expect(result.document.verificationmethodsList[0].type).to.equal(0);
            expect(result.document.verificationmethodsList[0].controller).to.equal("did:peaq:z5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
            expect(result.document.verificationmethodsList[0].publickeymultibase).to.equal("z5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
            expect(result.document.servicesList).to.be.empty;
            expect(result.document.authenticationsList[0]).to.equal("dc4702d6-71e7-4571-adb4-a7cd4945e1d3");
        });
    });
    describe("RBAC modules", function() {
        it("Check create role function", async function() {
            const result = await createRole(mockSdk, roleName);

            expect(result).to.equal("78709009-cf06-4224-8632-b5ee8512");
        });
        it("Check fetch role function", async function() {
            const result = await fetchRole(mockSdk, roleId, ownerAddress);

            expect(result.id).to.equal("78709009-cf06-4224-8632-b5ee8512");
            expect(result.name).to.equal("myRole");
            expect(result.enable).to.be.true;
        });
    });
  });

let myArray = new Uint8Array([
91, 3, 61, 222, 109, 242, 93, 160, 87, 238, 58, 89, 198, 154, 246, 204,
86, 191, 70, 18, 183, 137, 10, 251, 74, 245, 246, 212, 71, 72, 30, 71
]);

const mockSdk = {
    did: {
        create: async({name}) => {
            return {
                hash: myArray
            };
        },
        read: async ({name}) => {
            return {
                name: "test-did-14",
                value: "0x0a3964...316433",
                created: "1,682,100,174,024",
                document: {
                    id: "did:peaq:5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
                    controller: "did:peaq:5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
                    verificationmethodsList: [
                        {
                            id: "dc4702d6-71e7-4571-adb4-a7cd4945e1d3",
                            type: 0,
                            controller: "did:peaq:z5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
                            publickeymultibase: "z5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
                        }
                    ],
                    servicesList: [],
                    authenticationsList: [
                        "dc4702d6-71e7-4571-adb4-a7cd4945e1d3"
                    ]
                }
            };
        }
    },
    rbac: {
        createRole: async ({roleName}) => {
            return {
                roleId: roleId
            }
        },
        fetchRole: async ({owner, roldId}) => {
            return {
                id: roleId,
                name: roleName,
                enable: true
            }
        }
    }
};

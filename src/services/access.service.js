"use strict";

const shopModel = require("../models/shop.model");
const bcrypt = require("bcrypt");
const crypto = require("node:crypto");
const keyTokenService = require("./keyToken.service");
const { createTokenPair } = require("../auth/authUtils");
const { getInfoData } = require("../utils");
const { BadRequestError, AuthFailureError } = require("../core/error.response");
const { findByEmail } = require("./shop.service");
const KeyTokenService = require("./keyToken.service");

const roleShop = {
    SHOP: "SHOP",
    WRITER: "WRITER",
    EDITOR: "EDITOR",
    ADMIN: "ADMIN"
};

class AccessService {
    static logout = async (keyStore) => {
        console.log("abc  " + keyStore._id)
        const delKey = await KeyTokenService.removeKeyById(keyStore._id)


        console.log({ delKey })
        return delKey
    }

    /* 
         check email
         match password
         create at and rt and save
         generate token
         get info data
        */
    static login = async ({ email, password, refreshToken = null }) => {
        const foundShop = await findByEmail({ email });
        //1
        if (!foundShop) {
            throw new BadRequestError("Error: Shop not registered");
        }
        //2
        const match = bcrypt.compare(password, foundShop.password);
        if (!match) throw new AuthFailureError("Authentication failed");

        //3
        const privateKey = crypto.randomBytes(64).toString("hex");
        const publicKey = crypto.randomBytes(64).toString("hex");

        //4
        const { _id: userId } = foundShop._id;
        const tokens = await createTokenPair(
            { userId, email },
            publicKey,
            privateKey
        );

        await KeyTokenService.createKeyToken({
            userId: userId,
            refreshToken: tokens.refreshToken,
            privateKey,
            publicKey
        });

        console.log('abccccccc')
        return {
            shop: getInfoData({
                fileds: [ "_id", "name", "email" ],
                object: foundShop
            }),
            tokens
        }
    }

    static signUp = async ({ name, email, password }) => {
        const holderShop = await shopModel.findOne({ email }).lean();
        if (holderShop) {
            throw new BadRequestError("Error: Shop already exists");
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newShop = await shopModel.create({
            name,
            email,
            password: passwordHash,
            roles: [ roleShop.SHOP ]
        });

        if (newShop) {
            // create public key, private key
            const privateKey = crypto.randomBytes(64).toString("hex");
            const publicKey = crypto.randomBytes(64).toString("hex");
            console.log({ privateKey, publicKey });

            const keyStore = await keyTokenService.createKeyToken({
                userId: newShop._id,
                publicKey,
                privateKey
            });

            if (!keyStore) {
                return {
                    code: "xxxx",
                    message: "error: keyString is required"
                };
            }

            // created token pair
            const tokens = await createTokenPair(
                { userId: newShop._id, email },
                publicKey,
                privateKey
            );
            console.log(`Created token success`, tokens);

            return {
                code: 201,
                metadata: {
                    shop: getInfoData({
                        fileds: [ "_id", "name", "email" ],
                        object: newShop
                    }),
                    tokens
                }
            };
        }
        return {
            code: 200,
            metadata: null
        };
    };

    // todo: asymmetric cryptography
    // static signUp = async ({ name, email, password }) => {

    //     const holderShop = await shopModel.findOne({ email }).lean();
    //     if (holderShop) {
    //         throw new BadRequestError('Error: Shop already exists')
    //     }

    //     const passwordHash = await bcrypt.hash(password, 10);
    //     const newShop = await shopModel.create({
    //         name,
    //         email,
    //         password: passwordHash,
    //         roles: [ roleShop.SHOP ]
    //     });

    //     if (newShop) {
    //         // create public key, private key
    //         const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    //             modulusLength: 4096,
    //             publicKeyEncoding: {
    //                 type: 'spki',
    //                 format: 'pem',
    //             },
    //             privateKeyEncoding: {
    //                 type: 'pkcs8',
    //                 format: 'pem',
    //             }
    //         });

    //         console.log({ privateKey, publicKey });

    //         const publicKeyString = await keyTokenService.createKeyToken({
    //             userId: newShop._id,
    //             publicKey
    //         });

    //         if (!publicKeyString) {
    //             throw new BadRequestError('error: keyString is required');
    //         }
    //         console.log('publicKeyString: ' + publicKeyString);

    //         const publicKeyObject = crypto.createPublicKey(publicKeyString)
    //         console.log('publicKeyObject: ' + publicKeyObject);

    //         // created token pair
    //         const tokens = await createTokenPair(
    //             { userId: newShop._id, email },
    //             publicKeyString,
    //             privateKey
    //         );
    //         console.log(`Created token success`, tokens);

    //         return {
    //             code: 201,
    //             metadata: {
    //                 shop: getInfoData({ fileds: [ '_id', 'name', 'email' ], object: newShop }),
    //                 tokens
    //             }
    //         };
    //     }
    //     return {
    //         code: 200,
    //         metadata: null
    //     };
    // };
}

module.exports = AccessService;

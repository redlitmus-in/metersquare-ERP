from flask import Blueprint, request, jsonify
from controllers.file_upload_controller import *
# Create blueprint for purchase workflow routes
file_upload_routes = Blueprint('file_upload', __name__,url_prefix='/api')


@file_upload_routes.route('/upload_file', methods=['POST'])
def upload_files_route():
    flag = request.args.get('key')
    purchase_id = request.args.get('id')
    return upload_files(key=flag, id=purchase_id)

@file_upload_routes.route('/download_files', methods=['GET'])
def get_uploaded_file_route():
    flag = request.args.get('key')
    purchase_id = request.args.get('id')
    return get_uploaded_file(key=flag, id=purchase_id)

@file_upload_routes.route('/all_file_delete', methods=['DELETE'])
def all_delete_file_route():
    flag = request.args.get('key')
    purchase_id = request.args.get('id')
    return all_delete_file(key=flag, id=purchase_id)

@file_upload_routes.route('/delete_file', methods=['DELETE'])
def delete_file_file_routes():
    flag = request.args.get('key')
    purchase_id = request.args.get('id')
    return delete_file_file(key=flag,id=purchase_id)